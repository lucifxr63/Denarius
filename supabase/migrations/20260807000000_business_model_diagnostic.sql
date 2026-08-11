alter table cashflow.tenant
  add column if not exists business_model_source text,
  add column if not exists business_model_diagnosed_at timestamptz,
  add column if not exists business_profile jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tenant_business_model_source_chk') then
    alter table cashflow.tenant
      add constraint tenant_business_model_source_chk
      check (business_model_source is null or business_model_source in ('diagnostic', 'manual'));
  end if;
end $$;

create or replace function cashflow.set_business_model_profile(
  p_tenant_id uuid,
  p_business_model text,
  p_source text,
  p_profile jsonb default '{}'::jsonb
)
returns cashflow.tenant
language plpgsql
security definer
set search_path = cashflow, public, pg_temp
as $$
declare
  v_tenant cashflow.tenant;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_business_model not in ('pyme-tradicional', 'startup-saas') then raise exception 'invalid_business_model'; end if;
  if p_source not in ('diagnostic', 'manual') then raise exception 'invalid_business_model_source'; end if;
  if jsonb_typeof(coalesce(p_profile, '{}'::jsonb)) <> 'object' then raise exception 'invalid_business_profile'; end if;

  update cashflow.tenant
  set business_model = p_business_model,
      business_model_source = p_source,
      business_model_diagnosed_at = now(),
      business_profile = coalesce(p_profile, '{}'::jsonb),
      updated_at = now()
  where id = p_tenant_id and owner_id = auth.uid()
  returning * into v_tenant;

  if v_tenant.id is null then raise exception 'tenant_not_found'; end if;
  return v_tenant;
end;
$$;

revoke all on function cashflow.set_business_model_profile(uuid, text, text, jsonb) from public;
grant execute on function cashflow.set_business_model_profile(uuid, text, text, jsonb) to authenticated;
