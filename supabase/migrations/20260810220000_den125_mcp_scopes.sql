-- DEN-125.1: scopes de mínimo privilegio para MCP.
alter table cashflow.denarius_api_key drop constraint if exists denarius_api_key_read_only_scope;
alter table cashflow.denarius_api_key add constraint denarius_api_key_allowed_scopes check(
 cardinality(scopes)>=1 and scopes<@array['financial:read','alerts:read','actions:write','operations:write','close:prepare','close:approve','team:manage','mcp:manage']::text[] and 'financial:read'=any(scopes)
);
drop function if exists cashflow.create_denarius_api_key(uuid,text,timestamptz);
create function cashflow.create_denarius_api_key(p_tenant_id uuid,p_name text,p_expires_at timestamptz default null,p_scopes text[] default array['financial:read']::text[])returns jsonb language plpgsql security definer set search_path=cashflow,public,pg_temp as $$
declare v_uid uuid:=auth.uid();v_secret text;v_id uuid;v_scopes text[];begin if v_uid is null then raise exception'authentication_required';end if;if not exists(select 1 from cashflow.tenant where id=p_tenant_id and owner_id=v_uid)then raise exception'tenant_not_found';end if;if p_expires_at is not null and p_expires_at<=now()then raise exception'invalid_expiration';end if;
 select array_agg(distinct s order by s)into v_scopes from unnest(coalesce(p_scopes,'{}'))s;if v_scopes is null or not('financial:read'=any(v_scopes))or not(v_scopes<@array['financial:read','alerts:read','actions:write']::text[])then raise exception'invalid_scopes';end if;
 v_secret:='dnr_live_'||encode(extensions.gen_random_bytes(24),'hex');insert into cashflow.denarius_api_key(tenant_id,owner_id,name,prefix,secret_hash,scopes,expires_at)values(p_tenant_id,v_uid,trim(p_name),left(v_secret,17),encode(extensions.digest(v_secret,'sha256'),'hex'),v_scopes,p_expires_at)returning id into v_id;return jsonb_build_object('id',v_id,'secret',v_secret,'prefix',left(v_secret,17),'scopes',v_scopes);end$$;
revoke all on function cashflow.create_denarius_api_key(uuid,text,timestamptz,text[])from public,anon;grant execute on function cashflow.create_denarius_api_key(uuid,text,timestamptz,text[])to authenticated;
