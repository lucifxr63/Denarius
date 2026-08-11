-- Puente seguro entre una API key resuelta y los RPC que dependen de auth.uid().
begin;

alter table cashflow.agent_tool_audit
  add column if not exists api_key_id uuid references cashflow.denarius_api_key(id) on delete set null;

create index if not exists idx_agent_tool_audit_api_key
  on cashflow.agent_tool_audit(api_key_id, created_at desc)
  where api_key_id is not null;

create or replace function cashflow.denarius_set_principal(p_owner_id uuid)
returns void language plpgsql volatile security definer
set search_path = cashflow, public, pg_temp as $$
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden'; end if;
  if not exists(select 1 from auth.users where id=p_owner_id) then raise exception 'user_not_found'; end if;
  perform set_config('request.jwt.claim.sub',p_owner_id::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',p_owner_id,'role','authenticated')::text,true);
end $$;

create or replace function cashflow.denarius_metrics_pyme(p_tenant_id uuid,p_owner_id uuid,p_period text default to_char(now(),'YYYY-MM'))
returns jsonb language plpgsql volatile security definer set search_path=cashflow,public,pg_temp as $$
begin
  if not exists(select 1 from cashflow.tenant where id=p_tenant_id and owner_id=p_owner_id) then raise exception 'tenant_not_found'; end if;
  perform cashflow.denarius_set_principal(p_owner_id);
  return cashflow.metrics_pyme(p_tenant_id,p_period);
end $$;

create or replace function cashflow.denarius_metrics_saas(p_tenant_id uuid,p_owner_id uuid,p_period text default to_char(now(),'YYYY-MM'))
returns jsonb language plpgsql volatile security definer set search_path=cashflow,public,pg_temp as $$
begin
  if not exists(select 1 from cashflow.tenant where id=p_tenant_id and owner_id=p_owner_id) then raise exception 'tenant_not_found'; end if;
  perform cashflow.denarius_set_principal(p_owner_id);
  return cashflow.metrics_saas(p_tenant_id,p_period);
end $$;

create or replace function cashflow.denarius_financial_core_metrics(p_tenant_id uuid,p_owner_id uuid,p_as_of date default current_date)
returns jsonb language plpgsql volatile security definer set search_path=cashflow,public,pg_temp as $$
begin
  if not exists(select 1 from cashflow.tenant where id=p_tenant_id and owner_id=p_owner_id) then raise exception 'tenant_not_found'; end if;
  perform cashflow.denarius_set_principal(p_owner_id);
  return cashflow.financial_core_metrics(p_tenant_id,p_as_of);
end $$;

revoke all on function cashflow.denarius_set_principal(uuid) from public,anon,authenticated;
revoke all on function cashflow.denarius_metrics_pyme(uuid,uuid,text) from public,anon,authenticated;
revoke all on function cashflow.denarius_metrics_saas(uuid,uuid,text) from public,anon,authenticated;
revoke all on function cashflow.denarius_financial_core_metrics(uuid,uuid,date) from public,anon,authenticated;
grant execute on function cashflow.denarius_set_principal(uuid) to service_role;
grant execute on function cashflow.denarius_metrics_pyme(uuid,uuid,text) to service_role;
grant execute on function cashflow.denarius_metrics_saas(uuid,uuid,text) to service_role;
grant execute on function cashflow.denarius_financial_core_metrics(uuid,uuid,date) to service_role;

insert into supabase_migrations.schema_migrations(version,name,statements)
values('20260807081000','denarius_api_key_principal',array['service-only API key principal wrappers and audit attribution'])
on conflict(version) do nothing;
commit;
