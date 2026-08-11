create table if not exists cashflow.saas_customer (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references cashflow.tenant(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table if not exists cashflow.saas_plan (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references cashflow.tenant(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  monthly_price numeric(18,2) not null check (monthly_price >= 0),
  currency text not null default 'CLP',
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table if not exists cashflow.saas_subscription (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references cashflow.tenant(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references cashflow.saas_customer(id) on delete cascade,
  plan_id uuid not null references cashflow.saas_plan(id),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','CHURNED')),
  current_mrr numeric(18,2) not null check (current_mrr >= 0),
  started_at date not null default current_date,
  ended_at date,
  created_at timestamptz not null default now()
);

create table if not exists cashflow.saas_mrr_event (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references cashflow.tenant(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid not null references cashflow.saas_subscription(id) on delete cascade,
  event_type text not null check (event_type in ('NEW','EXPANSION','CONTRACTION','CHURN','REACTIVATION')),
  amount_delta numeric(18,2) not null,
  effective_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists idx_saas_event_tenant_date on cashflow.saas_mrr_event(tenant_id, effective_date);
create index if not exists idx_saas_subscription_tenant_status on cashflow.saas_subscription(tenant_id, status);

alter table cashflow.saas_customer enable row level security;
alter table cashflow.saas_plan enable row level security;
alter table cashflow.saas_subscription enable row level security;
alter table cashflow.saas_mrr_event enable row level security;

do $$
declare t text;
begin
  foreach t in array array['saas_customer','saas_plan','saas_subscription','saas_mrr_event'] loop
    execute format('drop policy if exists %I on cashflow.%I', 'cf_' || t || '_own', t);
    execute format('create policy %I on cashflow.%I for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())', 'cf_' || t || '_own', t);
  end loop;
end $$;

create or replace function cashflow.create_saas_subscription(
  p_tenant_id uuid, p_customer_name text, p_plan_name text,
  p_monthly_mrr numeric, p_started_at date default current_date
)
returns uuid language plpgsql security definer set search_path = cashflow, public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_customer uuid; v_plan uuid; v_subscription uuid;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from cashflow.tenant where id=p_tenant_id and owner_id=v_uid) then raise exception 'tenant_not_found'; end if;
  if p_monthly_mrr <= 0 then raise exception 'invalid_mrr'; end if;
  insert into cashflow.saas_customer(tenant_id,owner_id,name) values(p_tenant_id,v_uid,trim(p_customer_name))
    on conflict(tenant_id,name) do update set name=excluded.name returning id into v_customer;
  insert into cashflow.saas_plan(tenant_id,owner_id,name,monthly_price) values(p_tenant_id,v_uid,trim(p_plan_name),p_monthly_mrr)
    on conflict(tenant_id,name) do update set monthly_price=excluded.monthly_price returning id into v_plan;
  insert into cashflow.saas_subscription(tenant_id,owner_id,customer_id,plan_id,current_mrr,started_at)
    values(p_tenant_id,v_uid,v_customer,v_plan,p_monthly_mrr,p_started_at) returning id into v_subscription;
  insert into cashflow.saas_mrr_event(tenant_id,owner_id,subscription_id,event_type,amount_delta,effective_date)
    values(p_tenant_id,v_uid,v_subscription,'NEW',p_monthly_mrr,p_started_at);
  return v_subscription;
end $$;

create or replace function cashflow.change_saas_subscription(
  p_subscription_id uuid, p_new_mrr numeric, p_status text, p_effective_date date default current_date
)
returns void language plpgsql security definer set search_path = cashflow, public, pg_temp as $$
declare v_uid uuid:=auth.uid(); v_old cashflow.saas_subscription; v_type text; v_delta numeric;
begin
  select * into v_old from cashflow.saas_subscription where id=p_subscription_id and owner_id=v_uid for update;
  if v_old.id is null then raise exception 'subscription_not_found'; end if;
  if p_status not in ('ACTIVE','CHURNED') or p_new_mrr < 0 then raise exception 'invalid_subscription_change'; end if;
  if p_status='CHURNED' then v_type:='CHURN'; v_delta:=-v_old.current_mrr;
  elsif v_old.status='CHURNED' then v_type:='REACTIVATION'; v_delta:=p_new_mrr;
  elsif p_new_mrr>v_old.current_mrr then v_type:='EXPANSION'; v_delta:=p_new_mrr-v_old.current_mrr;
  elsif p_new_mrr<v_old.current_mrr then v_type:='CONTRACTION'; v_delta:=p_new_mrr-v_old.current_mrr;
  else return; end if;
  update cashflow.saas_subscription set current_mrr=p_new_mrr,status=p_status,
    ended_at=case when p_status='CHURNED' then p_effective_date else null end where id=p_subscription_id;
  insert into cashflow.saas_mrr_event(tenant_id,owner_id,subscription_id,event_type,amount_delta,effective_date)
    values(v_old.tenant_id,v_uid,p_subscription_id,v_type,v_delta,p_effective_date);
end $$;

create or replace function cashflow.saas_growth_metrics(p_tenant_id uuid, p_period text default to_char(current_date,'YYYY-MM'))
returns jsonb language plpgsql stable security invoker set search_path=cashflow,public as $$
declare v_uid uuid:=auth.uid(); v_start date:=to_date(p_period||'-01','YYYY-MM-DD'); v_end date:=(to_date(p_period||'-01','YYYY-MM-DD')+interval '1 month')::date;
  v_mrr numeric:=0; v_new numeric:=0; v_expansion numeric:=0; v_contraction numeric:=0; v_churn numeric:=0; v_opening numeric:=0; v_customers int:=0; v_count int:=0;
begin
  if not exists(select 1 from cashflow.tenant where id=p_tenant_id and owner_id=v_uid) then return '{}'::jsonb; end if;
  select coalesce(sum(amount_delta),0) into v_mrr from cashflow.saas_mrr_event where tenant_id=p_tenant_id and owner_id=v_uid and effective_date<v_end;
  select coalesce(sum(amount_delta),0) into v_opening from cashflow.saas_mrr_event where tenant_id=p_tenant_id and owner_id=v_uid and effective_date<v_start;
  select coalesce(sum(amount_delta) filter(where event_type in ('NEW','REACTIVATION')),0),
    coalesce(sum(amount_delta) filter(where event_type='EXPANSION'),0),
    abs(coalesce(sum(amount_delta) filter(where event_type='CONTRACTION'),0)),
    abs(coalesce(sum(amount_delta) filter(where event_type='CHURN'),0))
  into v_new,v_expansion,v_contraction,v_churn from cashflow.saas_mrr_event
    where tenant_id=p_tenant_id and owner_id=v_uid and effective_date>=v_start and effective_date<v_end;
  select count(*),count(distinct customer_id) into v_count,v_customers from cashflow.saas_subscription where tenant_id=p_tenant_id and owner_id=v_uid and status='ACTIVE';
  return jsonb_build_object('subscription_count',v_count,'active_customers',v_customers,'mrr',v_mrr,'new_mrr',v_new,'expansion_mrr',v_expansion,
    'contraction_mrr',v_contraction,'churned_mrr',v_churn,'net_new_mrr',v_new+v_expansion-v_contraction-v_churn,
    'revenue_churn_rate',case when v_opening>0 then v_churn/v_opening else null end);
end $$;

create or replace function cashflow.saas_subscription_workspace(p_tenant_id uuid)
returns jsonb language sql stable security invoker set search_path=cashflow,public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'customer',c.name,'plan',p.name,'current_mrr',s.current_mrr,'status',s.status,'started_at',s.started_at,'ended_at',s.ended_at) order by s.created_at desc),'[]'::jsonb)
  from cashflow.saas_subscription s join cashflow.saas_customer c on c.id=s.customer_id join cashflow.saas_plan p on p.id=s.plan_id
  where s.tenant_id=p_tenant_id and s.owner_id=auth.uid();
$$;

revoke all on function cashflow.create_saas_subscription(uuid,text,text,numeric,date) from public;
revoke all on function cashflow.change_saas_subscription(uuid,numeric,text,date) from public;
revoke all on function cashflow.saas_growth_metrics(uuid,text) from public;
revoke all on function cashflow.saas_subscription_workspace(uuid) from public;
grant select on cashflow.saas_customer, cashflow.saas_plan, cashflow.saas_subscription, cashflow.saas_mrr_event to authenticated;
grant execute on function cashflow.create_saas_subscription(uuid,text,text,numeric,date) to authenticated;
grant execute on function cashflow.change_saas_subscription(uuid,numeric,text,date) to authenticated;
grant execute on function cashflow.saas_growth_metrics(uuid,text) to authenticated;
grant execute on function cashflow.saas_subscription_workspace(uuid) to authenticated;
