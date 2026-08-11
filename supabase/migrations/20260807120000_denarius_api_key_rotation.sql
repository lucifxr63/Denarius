alter table cashflow.denarius_api_key
  add column if not exists rotated_from_id uuid references cashflow.denarius_api_key(id) on delete set null,
  add column if not exists replacement_key_id uuid references cashflow.denarius_api_key(id) on delete set null,
  add column if not exists rotation_grace_ends_at timestamptz;

create unique index if not exists denarius_api_key_single_replacement
  on cashflow.denarius_api_key(rotated_from_id) where rotated_from_id is not null;

create or replace function cashflow.rotate_denarius_api_key(
  p_key_id uuid, p_grace_minutes integer default 60, p_expires_at timestamptz default null
) returns jsonb language plpgsql security definer set search_path = cashflow, public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_old cashflow.denarius_api_key%rowtype; v_secret text; v_new_id uuid; v_grace timestamptz;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if p_grace_minutes < 5 or p_grace_minutes > 10080 then raise exception 'invalid_grace_period'; end if;
  select * into v_old from cashflow.denarius_api_key where id=p_key_id and owner_id=v_uid for update;
  if v_old.id is null then raise exception 'key_not_found'; end if;
  if v_old.revoked_at is not null or (v_old.expires_at is not null and v_old.expires_at<=now()) then raise exception 'key_inactive'; end if;
  if v_old.replacement_key_id is not null or v_old.rotation_grace_ends_at is not null then raise exception 'rotation_already_started'; end if;
  if p_expires_at is not null and p_expires_at<=now() then raise exception 'invalid_expiration'; end if;
  v_grace := now()+make_interval(mins=>p_grace_minutes);
  v_secret := 'dnr_live_' || encode(extensions.gen_random_bytes(24),'hex');
  insert into cashflow.denarius_api_key(tenant_id,owner_id,name,prefix,secret_hash,scopes,expires_at,rotated_from_id)
  values(v_old.tenant_id,v_uid,v_old.name,left(v_secret,17),encode(extensions.digest(v_secret,'sha256'),'hex'),v_old.scopes,p_expires_at,p_key_id)
  returning id into v_new_id;
  update cashflow.denarius_api_key set replacement_key_id=v_new_id,rotation_grace_ends_at=v_grace where id=p_key_id;
  return jsonb_build_object('id',v_new_id,'secret',v_secret,'prefix',left(v_secret,17),'scopes',v_old.scopes,'rotated_from_id',p_key_id,'grace_ends_at',v_grace);
end $$;

drop function if exists cashflow.list_denarius_api_keys(uuid);
create function cashflow.list_denarius_api_keys(p_tenant_id uuid)
returns table(id uuid,name text,prefix text,scopes text[],created_at timestamptz,last_used_at timestamptz,expires_at timestamptz,revoked_at timestamptz,rotated_from_id uuid,replacement_key_id uuid,rotation_grace_ends_at timestamptz)
language plpgsql security definer set search_path = cashflow, public, pg_temp as $$
begin
  update cashflow.denarius_api_key k set revoked_at=k.rotation_grace_ends_at
  where k.owner_id=auth.uid() and k.tenant_id=p_tenant_id and k.revoked_at is null and k.rotation_grace_ends_at<=now();
  return query select k.id,k.name,k.prefix,k.scopes,k.created_at,k.last_used_at,k.expires_at,k.revoked_at,k.rotated_from_id,k.replacement_key_id,k.rotation_grace_ends_at
  from cashflow.denarius_api_key k where k.tenant_id=p_tenant_id and k.owner_id=auth.uid() order by k.created_at desc;
end $$;

create or replace function cashflow.resolve_denarius_api_key(p_secret_hash text)
returns table(key_id uuid,tenant_id uuid,owner_id uuid,scopes text[])
language plpgsql security definer set search_path = cashflow, public, pg_temp as $$
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden'; end if;
  return query update cashflow.denarius_api_key k set last_used_at=now(),revoked_at=case when k.rotation_grace_ends_at<=now() then k.rotation_grace_ends_at else k.revoked_at end
    where k.secret_hash=lower(p_secret_hash) and k.revoked_at is null
      and (k.expires_at is null or k.expires_at>now())
      and (k.rotation_grace_ends_at is null or k.rotation_grace_ends_at>now())
    returning k.id,k.tenant_id,k.owner_id,k.scopes;
end $$;

revoke all on function cashflow.rotate_denarius_api_key(uuid,integer,timestamptz) from public,anon;
revoke all on function cashflow.list_denarius_api_keys(uuid) from public,anon;
revoke all on function cashflow.resolve_denarius_api_key(text) from public,anon,authenticated;
grant execute on function cashflow.rotate_denarius_api_key(uuid,integer,timestamptz) to authenticated;
grant execute on function cashflow.list_denarius_api_keys(uuid) to authenticated;
grant execute on function cashflow.resolve_denarius_api_key(text) to service_role;

insert into supabase_migrations.schema_migrations(version,name,statements)
values('20260807120000','denarius_api_key_rotation',array['overlapping Denarius API key rotation with server-enforced grace period'])
on conflict(version) do nothing;
