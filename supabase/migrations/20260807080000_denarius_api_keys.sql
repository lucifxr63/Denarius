-- Credenciales de larga duración para el MCP Desktop de Denarius.
-- El secreto se entrega una sola vez; la base conserva únicamente SHA-256.
begin;

create table if not exists cashflow.denarius_api_key (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references cashflow.tenant(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  prefix text not null check (prefix ~ '^dnr_live_[0-9a-f]{8}$'),
  secret_hash text not null unique check (secret_hash ~ '^[0-9a-f]{64}$'),
  scopes text[] not null default array['financial:read']::text[],
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  constraint denarius_api_key_read_only_scope check (
    cardinality(scopes) = 1 and scopes[1] = 'financial:read'
  )
);

create index if not exists idx_denarius_api_key_owner
  on cashflow.denarius_api_key(owner_id, tenant_id, created_at desc);
create index if not exists idx_denarius_api_key_active_hash
  on cashflow.denarius_api_key(secret_hash) where revoked_at is null;

alter table cashflow.denarius_api_key enable row level security;
revoke all on cashflow.denarius_api_key from public, anon, authenticated;
grant all on cashflow.denarius_api_key to service_role;

create or replace function cashflow.create_denarius_api_key(
  p_tenant_id uuid, p_name text, p_expires_at timestamptz default null
) returns jsonb language plpgsql security definer
set search_path = cashflow, public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_secret text; v_id uuid;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if not exists (select 1 from cashflow.tenant where id=p_tenant_id and owner_id=v_uid)
    then raise exception 'tenant_not_found'; end if;
  if p_expires_at is not null and p_expires_at <= now() then raise exception 'invalid_expiration'; end if;
  v_secret := 'dnr_live_' || encode(extensions.gen_random_bytes(24), 'hex');
  insert into cashflow.denarius_api_key(tenant_id,owner_id,name,prefix,secret_hash,expires_at)
  values(p_tenant_id,v_uid,trim(p_name),left(v_secret,17),encode(extensions.digest(v_secret,'sha256'),'hex'),p_expires_at)
  returning id into v_id;
  return jsonb_build_object('id',v_id,'secret',v_secret,'prefix',left(v_secret,17),'scopes',array['financial:read']::text[]);
end $$;

create or replace function cashflow.list_denarius_api_keys(p_tenant_id uuid)
returns table(id uuid,name text,prefix text,scopes text[],created_at timestamptz,last_used_at timestamptz,expires_at timestamptz,revoked_at timestamptz)
language sql stable security definer set search_path = cashflow, public, pg_temp as $$
  select k.id,k.name,k.prefix,k.scopes,k.created_at,k.last_used_at,k.expires_at,k.revoked_at
  from cashflow.denarius_api_key k
  where k.tenant_id=p_tenant_id and k.owner_id=auth.uid()
  order by k.created_at desc
$$;

create or replace function cashflow.revoke_denarius_api_key(p_key_id uuid)
returns boolean language plpgsql security definer set search_path = cashflow, public, pg_temp as $$
begin
  update cashflow.denarius_api_key set revoked_at=coalesce(revoked_at,now())
  where id=p_key_id and owner_id=auth.uid();
  return found;
end $$;

-- Sólo el gateway con service_role puede resolver un hash; nunca el secreto.
create or replace function cashflow.resolve_denarius_api_key(p_secret_hash text)
returns table(key_id uuid,tenant_id uuid,owner_id uuid,scopes text[])
language plpgsql security definer set search_path = cashflow, public, pg_temp as $$
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden'; end if;
  return query update cashflow.denarius_api_key k set last_used_at=now()
    where k.secret_hash=lower(p_secret_hash) and k.revoked_at is null
      and (k.expires_at is null or k.expires_at>now())
    returning k.id,k.tenant_id,k.owner_id,k.scopes;
end $$;

revoke all on function cashflow.create_denarius_api_key(uuid,text,timestamptz) from public,anon;
revoke all on function cashflow.list_denarius_api_keys(uuid) from public,anon;
revoke all on function cashflow.revoke_denarius_api_key(uuid) from public,anon;
revoke all on function cashflow.resolve_denarius_api_key(text) from public,anon,authenticated;
grant execute on function cashflow.create_denarius_api_key(uuid,text,timestamptz) to authenticated;
grant execute on function cashflow.list_denarius_api_keys(uuid) to authenticated;
grant execute on function cashflow.revoke_denarius_api_key(uuid) to authenticated;
grant execute on function cashflow.resolve_denarius_api_key(text) to service_role;

insert into supabase_migrations.schema_migrations(version,name,statements)
values('20260807080000','denarius_api_keys',array['read-only Denarius MCP API key lifecycle'])
on conflict(version) do nothing;
commit;
