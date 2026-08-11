-- DEN-132: Denarius-only member lifecycle. Never mutates auth.users.
create table if not exists cashflow.denarius_team_member_audit(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references cashflow.tenant(id)on delete cascade,
 actor_id uuid not null references auth.users(id),member_user_id uuid not null references auth.users(id),action text not null check(action in('ROLE_CHANGED','SUSPENDED','REACTIVATED','REMOVED')),
 previous_role text,new_role text,created_at timestamptz not null default now()
);
alter table cashflow.denarius_team_member_audit enable row level security;
create policy denarius_team_audit_admin_read on cashflow.denarius_team_member_audit for select to authenticated using(cashflow.denarius_has_permission(tenant_id,'team.manage'));
revoke all on cashflow.denarius_team_member_audit from public,anon,authenticated;grant select on cashflow.denarius_team_member_audit to authenticated;grant select,insert,update,delete on cashflow.denarius_team_member_audit to service_role;

create or replace function cashflow.update_denarius_team_member_role(p_tenant_id uuid,p_user_id uuid,p_role_key text)returns boolean language plpgsql security definer set search_path=cashflow,public,pg_temp as $$declare v_old text;begin
 if not cashflow.denarius_has_permission(p_tenant_id,'team.manage')then raise exception'FORBIDDEN';end if;
 if not exists(select 1 from cashflow.denarius_role_template where key=p_role_key and assignable)then raise exception'INVALID_ROLE';end if;
 select role_key into v_old from cashflow.denarius_tenant_member where tenant_id=p_tenant_id and user_id=p_user_id for update;if v_old is null then raise exception'MEMBER_NOT_FOUND';end if;
 update cashflow.denarius_tenant_member set role_key=p_role_key where tenant_id=p_tenant_id and user_id=p_user_id;
 if v_old<>p_role_key then insert into cashflow.denarius_team_member_audit(tenant_id,actor_id,member_user_id,action,previous_role,new_role)values(p_tenant_id,auth.uid(),p_user_id,'ROLE_CHANGED',v_old,p_role_key);end if;return true;
end$$;
create or replace function cashflow.set_denarius_team_member_status(p_tenant_id uuid,p_user_id uuid,p_status text)returns boolean language plpgsql security definer set search_path=cashflow,public,pg_temp as $$declare v cashflow.denarius_tenant_member;begin
 if not cashflow.denarius_has_permission(p_tenant_id,'team.manage')then raise exception'FORBIDDEN';end if;if p_status not in('ACTIVE','SUSPENDED')then raise exception'INVALID_STATUS';end if;
 select*into v from cashflow.denarius_tenant_member where tenant_id=p_tenant_id and user_id=p_user_id for update;if v.user_id is null then raise exception'MEMBER_NOT_FOUND';end if;
 update cashflow.denarius_tenant_member set status=p_status where tenant_id=p_tenant_id and user_id=p_user_id;
 if v.status<>p_status then insert into cashflow.denarius_team_member_audit(tenant_id,actor_id,member_user_id,action,previous_role,new_role)values(p_tenant_id,auth.uid(),p_user_id,case p_status when'SUSPENDED'then'SUSPENDED'else'REACTIVATED'end,v.role_key,v.role_key);end if;return true;
end$$;
create or replace function cashflow.remove_denarius_team_member(p_tenant_id uuid,p_user_id uuid)returns boolean language plpgsql security definer set search_path=cashflow,public,pg_temp as $$declare v_role text;begin
 if not cashflow.denarius_has_permission(p_tenant_id,'team.manage')then raise exception'FORBIDDEN';end if;select role_key into v_role from cashflow.denarius_tenant_member where tenant_id=p_tenant_id and user_id=p_user_id for update;if v_role is null then raise exception'MEMBER_NOT_FOUND';end if;
 insert into cashflow.denarius_team_member_audit(tenant_id,actor_id,member_user_id,action,previous_role)values(p_tenant_id,auth.uid(),p_user_id,'REMOVED',v_role);delete from cashflow.denarius_tenant_member where tenant_id=p_tenant_id and user_id=p_user_id;return true;
end$$;
create or replace function cashflow.denarius_team_member_audit_workspace(p_tenant_id uuid)returns jsonb language sql stable security definer set search_path=cashflow,public,pg_temp as $$select coalesce(jsonb_agg(jsonb_build_object('id',id,'member_user_id',member_user_id,'action',action,'previous_role',previous_role,'new_role',new_role,'created_at',created_at)order by created_at desc),'[]'::jsonb)from(select*from cashflow.denarius_team_member_audit where tenant_id=p_tenant_id and cashflow.denarius_has_permission(p_tenant_id,'team.manage')order by created_at desc limit 50)a$$;
revoke all on function cashflow.update_denarius_team_member_role(uuid,uuid,text),cashflow.set_denarius_team_member_status(uuid,uuid,text),cashflow.remove_denarius_team_member(uuid,uuid),cashflow.denarius_team_member_audit_workspace(uuid)from public,anon;
grant execute on function cashflow.update_denarius_team_member_role(uuid,uuid,text),cashflow.set_denarius_team_member_status(uuid,uuid,text),cashflow.remove_denarius_team_member(uuid,uuid),cashflow.denarius_team_member_audit_workspace(uuid)to authenticated;
