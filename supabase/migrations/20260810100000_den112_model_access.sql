-- DEN-112: autorización de modelo aislada de los perfiles compartidos por otros productos.
create or replace function cashflow.denarius_access_context(p_tenant_id uuid)
returns jsonb language plpgsql stable security invoker set search_path=cashflow,public as $$
declare v_tenant cashflow.tenant; v_admin boolean;
begin
  select * into v_tenant from cashflow.tenant where id=p_tenant_id and owner_id=auth.uid();
  if v_tenant.id is null then raise exception 'tenant_not_found'; end if;
  v_admin:=coalesce(auth.jwt()->'app_metadata'->>'denarius_role','')='platform_admin';
  return jsonb_build_object('business_model',v_tenant.business_model,'can_change_business_model',v_admin,'role',case when v_admin then'platform_admin'else'member'end);
end $$;

create or replace function cashflow.set_business_model_profile(p_tenant_id uuid,p_business_model text,p_source text,p_profile jsonb default '{}'::jsonb)
returns cashflow.tenant language plpgsql security definer set search_path=cashflow,public,pg_temp as $$
declare v_tenant cashflow.tenant; v_diagnosed timestamptz; v_admin boolean;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_business_model not in('pyme-tradicional','startup-saas') then raise exception 'invalid_business_model'; end if;
  if p_source not in('diagnostic','manual') then raise exception 'invalid_business_model_source'; end if;
  if jsonb_typeof(coalesce(p_profile,'{}'::jsonb))<>'object' then raise exception 'invalid_business_profile'; end if;
  select business_model_diagnosed_at into v_diagnosed from cashflow.tenant where id=p_tenant_id and owner_id=auth.uid();
  if not found then raise exception 'tenant_not_found'; end if;
  v_admin:=coalesce(auth.jwt()->'app_metadata'->>'denarius_role','')='platform_admin';
  if v_diagnosed is not null and not v_admin then raise exception 'business_model_locked'; end if;
  if p_source='manual' and not v_admin then raise exception 'business_model_locked'; end if;
  update cashflow.tenant set business_model=p_business_model,business_model_source=p_source,business_model_diagnosed_at=now(),business_profile=coalesce(p_profile,'{}'::jsonb),updated_at=now()
  where id=p_tenant_id and owner_id=auth.uid() returning * into v_tenant;
  return v_tenant;
end $$;

revoke all on function cashflow.denarius_access_context(uuid) from public,anon;
grant execute on function cashflow.denarius_access_context(uuid) to authenticated;

create or replace function cashflow.unit_economics_input_context(p_tenant_id uuid,p_period text)
returns jsonb language sql stable security invoker set search_path=cashflow,public as $$
  select to_jsonb(i)-'id'-'tenant_id'-'owner_id'-'period'-'updated_at' from cashflow.unit_economics_input i
  where i.tenant_id=p_tenant_id and i.owner_id=auth.uid() and i.period=to_date(p_period||'-01','YYYY-MM-DD')
$$;
revoke all on function cashflow.unit_economics_input_context(uuid,text) from public,anon;
grant execute on function cashflow.unit_economics_input_context(uuid,text) to authenticated;
revoke all on function cashflow.set_business_model_profile(uuid,text,text,jsonb) from public,anon;
grant execute on function cashflow.set_business_model_profile(uuid,text,text,jsonb) to authenticated;
