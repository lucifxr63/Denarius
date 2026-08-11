alter table cashflow.saas_mrr_event
  add column if not exists previous_mrr numeric(18,2),
  add column if not exists resulting_mrr numeric(18,2),
  add column if not exists previous_plan text,
  add column if not exists resulting_plan text,
  add column if not exists note text check (note is null or char_length(note) <= 500);

update cashflow.saas_mrr_event
set resulting_mrr = case when event_type = 'NEW' then amount_delta else resulting_mrr end
where resulting_mrr is null;

create or replace function cashflow.create_saas_subscription(
  p_tenant_id uuid, p_customer_name text, p_plan_name text,
  p_monthly_mrr numeric, p_started_at date default current_date
)
returns uuid language plpgsql security definer set search_path = cashflow, public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_customer uuid; v_plan uuid; v_subscription uuid;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from cashflow.tenant where id=p_tenant_id and owner_id=v_uid) then raise exception 'tenant_not_found'; end if;
  if p_monthly_mrr <= 0 or trim(p_customer_name) = '' or trim(p_plan_name) = '' then raise exception 'invalid_subscription'; end if;
  insert into cashflow.saas_customer(tenant_id,owner_id,name) values(p_tenant_id,v_uid,trim(p_customer_name))
    on conflict(tenant_id,name) do update set name=excluded.name returning id into v_customer;
  insert into cashflow.saas_plan(tenant_id,owner_id,name,monthly_price) values(p_tenant_id,v_uid,trim(p_plan_name),p_monthly_mrr)
    on conflict(tenant_id,name) do update set monthly_price=excluded.monthly_price returning id into v_plan;
  insert into cashflow.saas_subscription(tenant_id,owner_id,customer_id,plan_id,current_mrr,started_at)
    values(p_tenant_id,v_uid,v_customer,v_plan,p_monthly_mrr,p_started_at) returning id into v_subscription;
  insert into cashflow.saas_mrr_event(tenant_id,owner_id,subscription_id,event_type,amount_delta,effective_date,previous_mrr,resulting_mrr,resulting_plan)
    values(p_tenant_id,v_uid,v_subscription,'NEW',p_monthly_mrr,p_started_at,0,p_monthly_mrr,trim(p_plan_name));
  return v_subscription;
end $$;

create or replace function cashflow.update_saas_subscription(
  p_subscription_id uuid,
  p_new_mrr numeric,
  p_new_plan_name text,
  p_status text,
  p_effective_date date default current_date,
  p_note text default null
)
returns text language plpgsql security definer set search_path = cashflow, public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_old cashflow.saas_subscription;
  v_old_plan text;
  v_new_plan_id uuid;
  v_type text;
  v_delta numeric;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  select s.* into v_old from cashflow.saas_subscription s
  where s.id = p_subscription_id and s.owner_id = v_uid for update;
  if v_old.id is null then raise exception 'subscription_not_found'; end if;
  select name into v_old_plan from cashflow.saas_plan where id = v_old.plan_id and owner_id = v_uid;
  if p_status not in ('ACTIVE','CHURNED') or p_new_mrr < 0 or trim(p_new_plan_name) = '' then
    raise exception 'invalid_subscription_change';
  end if;
  if p_status = 'ACTIVE' and p_new_mrr <= 0 then raise exception 'active_subscription_requires_mrr'; end if;
  if p_status = 'CHURNED' and v_old.status = 'CHURNED' then raise exception 'subscription_already_churned'; end if;

  if p_status = 'CHURNED' then v_type := 'CHURN'; v_delta := -v_old.current_mrr;
  elsif v_old.status = 'CHURNED' then v_type := 'REACTIVATION'; v_delta := p_new_mrr;
  elsif p_new_mrr > v_old.current_mrr then v_type := 'EXPANSION'; v_delta := p_new_mrr - v_old.current_mrr;
  elsif p_new_mrr < v_old.current_mrr then v_type := 'CONTRACTION'; v_delta := p_new_mrr - v_old.current_mrr;
  else raise exception 'subscription_change_has_no_mrr_effect'; end if;

  insert into cashflow.saas_plan(tenant_id, owner_id, name, monthly_price)
  values(v_old.tenant_id, v_uid, trim(p_new_plan_name), p_new_mrr)
  on conflict(tenant_id, name) do update set monthly_price = excluded.monthly_price
  returning id into v_new_plan_id;

  update cashflow.saas_subscription
  set current_mrr = p_new_mrr, plan_id = v_new_plan_id, status = p_status,
      ended_at = case when p_status = 'CHURNED' then p_effective_date else null end
  where id = p_subscription_id;

  insert into cashflow.saas_mrr_event(
    tenant_id, owner_id, subscription_id, event_type, amount_delta, effective_date,
    previous_mrr, resulting_mrr, previous_plan, resulting_plan, note
  ) values(
    v_old.tenant_id, v_uid, p_subscription_id, v_type, v_delta, p_effective_date,
    v_old.current_mrr, case when p_status = 'CHURNED' then 0 else p_new_mrr end,
    v_old_plan, trim(p_new_plan_name), nullif(trim(p_note), '')
  );
  return v_type;
end $$;

create or replace function cashflow.saas_subscription_history(p_subscription_id uuid)
returns jsonb language sql stable security invoker set search_path = cashflow, public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id, 'event_type', e.event_type, 'amount_delta', e.amount_delta,
    'effective_date', e.effective_date, 'previous_mrr', e.previous_mrr,
    'resulting_mrr', e.resulting_mrr, 'previous_plan', e.previous_plan,
    'resulting_plan', e.resulting_plan, 'note', e.note, 'created_at', e.created_at
  ) order by e.effective_date desc, e.created_at desc), '[]'::jsonb)
  from cashflow.saas_mrr_event e
  where e.subscription_id = p_subscription_id and e.owner_id = auth.uid();
$$;

revoke all on function cashflow.update_saas_subscription(uuid,numeric,text,text,date,text) from public;
revoke all on function cashflow.saas_subscription_history(uuid) from public;
grant execute on function cashflow.update_saas_subscription(uuid,numeric,text,text,date,text) to authenticated;
grant execute on function cashflow.saas_subscription_history(uuid) to authenticated;
