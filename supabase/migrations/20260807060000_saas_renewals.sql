alter table cashflow.saas_subscription
  add column if not exists renewal_date date,
  add column if not exists renewal_owner text check (renewal_owner is null or char_length(renewal_owner)<=120),
  add column if not exists renewal_status text not null default 'PENDING' check (renewal_status in ('PENDING','IN_PROGRESS','RENEWED','WILL_NOT_RENEW')),
  add column if not exists renewal_note text check (renewal_note is null or char_length(renewal_note)<=500),
  add column if not exists renewal_updated_at timestamptz;

create or replace function cashflow.update_saas_renewal(p_subscription_id uuid,p_renewal_date date,p_owner text,p_status text,p_note text default null)
returns void language plpgsql security definer set search_path=cashflow,public,pg_temp as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if p_status not in ('PENDING','IN_PROGRESS','RENEWED','WILL_NOT_RENEW') then raise exception 'invalid_renewal_status'; end if;
  update cashflow.saas_subscription set renewal_date=p_renewal_date,renewal_owner=nullif(trim(p_owner),''),renewal_status=p_status,
    renewal_note=nullif(trim(p_note),''),renewal_updated_at=now()
  where id=p_subscription_id and owner_id=v_uid;
  if not found then raise exception 'subscription_not_found'; end if;
end $$;

create or replace function cashflow.saas_renewal_workspace(p_tenant_id uuid)
returns jsonb language plpgsql stable security invoker set search_path=cashflow,public as $$
declare v_uid uuid:=auth.uid(); v_items jsonb; v_overdue int; v_30 int; v_mrr numeric;
begin
  if not exists(select 1 from cashflow.tenant where id=p_tenant_id and owner_id=v_uid) then raise exception 'tenant_not_found'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('subscription_id',s.id,'customer',c.name,'plan',p.name,'mrr',s.current_mrr,
    'renewal_date',s.renewal_date,'owner',s.renewal_owner,'status',s.renewal_status,'note',s.renewal_note,
    'days_remaining',s.renewal_date-current_date,
    'urgency',case when s.renewal_date<current_date then 'OVERDUE' when s.renewal_date<=current_date+7 then 'CRITICAL' when s.renewal_date<=current_date+30 then 'SOON' else 'PLANNED' end,
    'suggested_action',case when s.renewal_date<current_date then 'Escalar y confirmar continuidad' when s.renewal_date<=current_date+7 then 'Contactar y acordar siguiente paso' when s.renewal_date<=current_date+30 then 'Preparar propuesta de renovación' else 'Revisar salud y responsables' end
  ) order by s.renewal_date),'[]'::jsonb),
  count(*) filter(where s.renewal_date<current_date),count(*) filter(where s.renewal_date between current_date and current_date+30),
  coalesce(sum(s.current_mrr) filter(where s.renewal_date<=current_date+30),0)
  into v_items,v_overdue,v_30,v_mrr
  from cashflow.saas_subscription s join cashflow.saas_customer c on c.id=s.customer_id join cashflow.saas_plan p on p.id=s.plan_id
  where s.tenant_id=p_tenant_id and s.owner_id=v_uid and s.status='ACTIVE' and s.renewal_date is not null and s.renewal_status not in ('RENEWED','WILL_NOT_RENEW');
  return jsonb_build_object('overdue',v_overdue,'due_30_days',v_30,'mrr_due_30_days',v_mrr,'items',v_items);
end $$;

create or replace function cashflow.saas_subscription_workspace(p_tenant_id uuid)
returns jsonb language sql stable security invoker set search_path=cashflow,public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'customer',c.name,'plan',p.name,'current_mrr',s.current_mrr,'status',s.status,
    'started_at',s.started_at,'ended_at',s.ended_at,'renewal_date',s.renewal_date,'renewal_owner',s.renewal_owner,
    'renewal_status',s.renewal_status,'renewal_note',s.renewal_note) order by s.created_at desc),'[]'::jsonb)
  from cashflow.saas_subscription s join cashflow.saas_customer c on c.id=s.customer_id join cashflow.saas_plan p on p.id=s.plan_id
  where s.tenant_id=p_tenant_id and s.owner_id=auth.uid();
$$;
revoke all on function cashflow.update_saas_renewal(uuid,date,text,text,text) from public;
revoke all on function cashflow.saas_renewal_workspace(uuid) from public;
grant execute on function cashflow.update_saas_renewal(uuid,date,text,text,text) to authenticated;
grant execute on function cashflow.saas_renewal_workspace(uuid) to authenticated;
