-- DEN-118: contexto activo Denarius aislado del resto de productos compartidos.
create table if not exists cashflow.denarius_user_preference (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  active_tenant_id uuid not null references cashflow.tenant(id) on delete cascade,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table cashflow.denarius_user_preference enable row level security;
drop policy if exists denarius_user_preference_own on cashflow.denarius_user_preference;
create policy denarius_user_preference_own on cashflow.denarius_user_preference for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create or replace function cashflow.list_denarius_tenants() returns setof cashflow.tenant
language sql security invoker stable set search_path=cashflow,public as $$
 select t from cashflow.tenant t where t.owner_id=auth.uid() order by t.created_at,t.id;
$$;
create or replace function cashflow.get_active_denarius_tenant() returns cashflow.tenant
language plpgsql security definer set search_path=cashflow,public as $$
declare v_owner uuid:=auth.uid(); v_tenant cashflow.tenant;
begin
 if v_owner is null then raise exception 'AUTH_REQUIRED'; end if;
 select t.* into v_tenant from cashflow.denarius_user_preference p join cashflow.tenant t on t.id=p.active_tenant_id and t.owner_id=p.owner_id where p.owner_id=v_owner;
 if v_tenant.id is null then
  select t.* into v_tenant from cashflow.tenant t where t.owner_id=v_owner order by t.created_at,t.id limit 1;
  if v_tenant.id is not null then insert into cashflow.denarius_user_preference(owner_id,active_tenant_id) values(v_owner,v_tenant.id) on conflict(owner_id) do update set active_tenant_id=excluded.active_tenant_id,updated_at=now(); end if;
 end if;
 return v_tenant;
end $$;
create or replace function cashflow.set_active_denarius_tenant(p_tenant_id uuid) returns cashflow.tenant
language plpgsql security definer set search_path=cashflow,public as $$
declare v_owner uuid:=auth.uid(); v_tenant cashflow.tenant;
begin
 if v_owner is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into v_tenant from cashflow.tenant where id=p_tenant_id and owner_id=v_owner;
 if v_tenant.id is null then raise exception 'TENANT_NOT_OWNED'; end if;
 insert into cashflow.denarius_user_preference(owner_id,active_tenant_id) values(v_owner,p_tenant_id) on conflict(owner_id) do update set active_tenant_id=excluded.active_tenant_id,updated_at=now();
 return v_tenant;
end $$;
revoke all on cashflow.denarius_user_preference from anon;
grant select,insert,update,delete on cashflow.denarius_user_preference to authenticated;
revoke all on function cashflow.list_denarius_tenants() from public;
revoke all on function cashflow.get_active_denarius_tenant() from public;
revoke all on function cashflow.set_active_denarius_tenant(uuid) from public;
grant execute on function cashflow.list_denarius_tenants() to authenticated;
grant execute on function cashflow.get_active_denarius_tenant() to authenticated;
grant execute on function cashflow.set_active_denarius_tenant(uuid) to authenticated;
