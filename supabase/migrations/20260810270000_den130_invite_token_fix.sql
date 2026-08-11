-- DEN-130: invitation token generation must not depend on pgcrypto search_path.
create or replace function cashflow.create_denarius_team_invite(p_tenant_id uuid,p_role_key text,p_email text default null,p_days int default 7)
returns jsonb language plpgsql security definer set search_path=cashflow,public,extensions,pg_temp as $$
declare v_token text:=encode(extensions.gen_random_bytes(24),'hex');v_id uuid;begin
 if not cashflow.denarius_has_permission(p_tenant_id,'team.manage')then raise exception'FORBIDDEN';end if;
 if not exists(select 1 from cashflow.denarius_role_template where key=p_role_key and assignable)then raise exception'INVALID_ROLE';end if;
 insert into cashflow.denarius_team_invite(tenant_id,created_by,email,role_key,token_hash,expires_at)values(p_tenant_id,auth.uid(),nullif(lower(trim(p_email)),''),p_role_key,encode(extensions.digest(v_token,'sha256'),'hex'),now()+make_interval(days=>greatest(1,least(p_days,30))))returning id into v_id;
 return jsonb_build_object('id',v_id,'token',v_token,'expires_at',now()+make_interval(days=>greatest(1,least(p_days,30))));
end$$;
create or replace function cashflow.accept_denarius_team_invite(p_token text)returns uuid language plpgsql security definer set search_path=cashflow,public,extensions,pg_temp as $$
declare v cashflow.denarius_team_invite;begin
 select*into v from cashflow.denarius_team_invite where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and revoked_at is null and accepted_at is null and expires_at>now()for update;
 if v.id is null then raise exception'INVITE_INVALID_OR_EXPIRED';end if;
 insert into cashflow.denarius_tenant_member(tenant_id,user_id,role_key)values(v.tenant_id,auth.uid(),v.role_key)on conflict(tenant_id,user_id)do update set role_key=excluded.role_key,status='ACTIVE';
 update cashflow.denarius_team_invite set accepted_by=auth.uid(),accepted_at=now()where id=v.id;return v.tenant_id;
end$$;
revoke all on function cashflow.create_denarius_team_invite(uuid,text,text,int),cashflow.accept_denarius_team_invite(text)from public,anon;
grant execute on function cashflow.create_denarius_team_invite(uuid,text,text,int),cashflow.accept_denarius_team_invite(text)to authenticated;
