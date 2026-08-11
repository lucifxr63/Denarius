-- DEN-113: alta idempotente de empresa Denarius; no modifica profiles ni triggers compartidos.
create or replace function cashflow.ensure_denarius_tenant()
returns cashflow.tenant language plpgsql security definer set search_path=cashflow,public,pg_temp as $$
declare v_uid uuid:=auth.uid();v_tenant cashflow.tenant;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 select*into v_tenant from cashflow.tenant where owner_id=v_uid order by created_at limit 1;
 if v_tenant.id is null then insert into cashflow.tenant(owner_id,name,business_model,business_profile)values(v_uid,'Mi empresa','pyme-tradicional','{}'::jsonb)returning*into v_tenant;end if;
 return v_tenant;
end $$;
revoke all on function cashflow.ensure_denarius_tenant() from public,anon;
grant execute on function cashflow.ensure_denarius_tenant() to authenticated;
