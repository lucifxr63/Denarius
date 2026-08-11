-- DEN-123: membresías Denarius aisladas de auth compartido con otros productos.
create table if not exists cashflow.denarius_role_template(
 key text primary key, name text not null, description text not null, permissions text[] not null, assignable boolean not null default true, sort_order int not null
);
insert into cashflow.denarius_role_template(key,name,description,permissions,assignable,sort_order) values
('owner','Propietario','Control total, equipo y configuración.',array['financial.read','financial.write','close.manage','team.manage','mcp.manage'],false,10),
('finance_manager','Responsable de finanzas','Opera caja, alertas, acciones y cierres.',array['financial.read','financial.write','close.manage'],true,20),
('operator','Operaciones','Actualiza movimientos y ejecuta acciones asignadas.',array['financial.read','operations.write'],true,30),
('viewer','Solo lectura','Consulta paneles y cierres sin modificar datos.',array['financial.read'],true,40),
('advisor','Asesor externo','Revisa resultados y evidencia; sin MCP ni configuración.',array['financial.read','close.read'],true,50)
on conflict(key) do update set name=excluded.name,description=excluded.description,permissions=excluded.permissions,assignable=excluded.assignable,sort_order=excluded.sort_order;

create table if not exists cashflow.denarius_tenant_member(
 tenant_id uuid not null references cashflow.tenant(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,
 role_key text not null references cashflow.denarius_role_template(key),status text not null default 'ACTIVE' check(status in('ACTIVE','SUSPENDED')),
 created_at timestamptz not null default now(),primary key(tenant_id,user_id)
);
create table if not exists cashflow.denarius_team_invite(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references cashflow.tenant(id) on delete cascade,
 created_by uuid not null references auth.users(id),email text,role_key text not null references cashflow.denarius_role_template(key),token_hash text not null unique,
 expires_at timestamptz not null,accepted_by uuid references auth.users(id),accepted_at timestamptz,revoked_at timestamptz,created_at timestamptz not null default now()
);
alter table cashflow.denarius_tenant_member enable row level security;alter table cashflow.denarius_team_invite enable row level security;alter table cashflow.denarius_role_template enable row level security;
create or replace function cashflow.denarius_has_permission(p_tenant uuid,p_permission text)returns boolean language sql stable security definer set search_path=cashflow,public as $$
 select exists(select 1 from cashflow.tenant t where t.id=p_tenant and t.owner_id=auth.uid()) or exists(select 1 from cashflow.denarius_tenant_member m join cashflow.denarius_role_template r on r.key=m.role_key where m.tenant_id=p_tenant and m.user_id=auth.uid() and m.status='ACTIVE' and p_permission=any(r.permissions))
$$;
create policy denarius_templates_read on cashflow.denarius_role_template for select to authenticated using(true);
create policy denarius_members_read on cashflow.denarius_tenant_member for select to authenticated using(user_id=auth.uid() or cashflow.denarius_has_permission(tenant_id,'team.manage'));
create policy denarius_invites_admin on cashflow.denarius_team_invite for select to authenticated using(cashflow.denarius_has_permission(tenant_id,'team.manage'));

create or replace function cashflow.denarius_team_workspace(p_tenant_id uuid)returns jsonb language plpgsql security definer set search_path=cashflow,public,pg_temp as $$
declare v_templates jsonb;v_members jsonb;v_invites jsonb;
begin if not cashflow.denarius_has_permission(p_tenant_id,'team.manage') then raise exception'FORBIDDEN';end if;
 select coalesce(jsonb_agg(to_jsonb(r)order by sort_order),'[]')into v_templates from cashflow.denarius_role_template r where assignable;
 select coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,'role_key',m.role_key,'status',m.status,'created_at',m.created_at)),'[]')into v_members from cashflow.denarius_tenant_member m where tenant_id=p_tenant_id;
 select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'email',i.email,'role_key',i.role_key,'expires_at',i.expires_at,'accepted_at',i.accepted_at,'revoked_at',i.revoked_at,'created_at',i.created_at)order by i.created_at desc),'[]')into v_invites from cashflow.denarius_team_invite i where tenant_id=p_tenant_id;
 return jsonb_build_object('templates',v_templates,'members',v_members,'invites',v_invites);end$$;
create or replace function cashflow.create_denarius_team_invite(p_tenant_id uuid,p_role_key text,p_email text default null,p_days int default 7)returns jsonb language plpgsql security definer set search_path=cashflow,public,pg_temp as $$
declare v_token text:=encode(gen_random_bytes(24),'hex');v_id uuid;begin if not cashflow.denarius_has_permission(p_tenant_id,'team.manage')then raise exception'FORBIDDEN';end if;if not exists(select 1 from cashflow.denarius_role_template where key=p_role_key and assignable)then raise exception'INVALID_ROLE';end if;
 insert into cashflow.denarius_team_invite(tenant_id,created_by,email,role_key,token_hash,expires_at)values(p_tenant_id,auth.uid(),nullif(lower(trim(p_email)),''),p_role_key,encode(digest(v_token,'sha256'),'hex'),now()+make_interval(days=>greatest(1,least(p_days,30))))returning id into v_id;
 return jsonb_build_object('id',v_id,'token',v_token,'expires_at',now()+make_interval(days=>greatest(1,least(p_days,30))));end$$;
create or replace function cashflow.accept_denarius_team_invite(p_token text)returns uuid language plpgsql security definer set search_path=cashflow,public,pg_temp as $$
declare v cashflow.denarius_team_invite;begin select*into v from cashflow.denarius_team_invite where token_hash=encode(digest(p_token,'sha256'),'hex') and revoked_at is null and accepted_at is null and expires_at>now()for update;if v.id is null then raise exception'INVITE_INVALID_OR_EXPIRED';end if;
 insert into cashflow.denarius_tenant_member(tenant_id,user_id,role_key)values(v.tenant_id,auth.uid(),v.role_key)on conflict(tenant_id,user_id)do update set role_key=excluded.role_key,status='ACTIVE';update cashflow.denarius_team_invite set accepted_by=auth.uid(),accepted_at=now()where id=v.id;return v.tenant_id;end$$;
create or replace function cashflow.revoke_denarius_team_invite(p_invite_id uuid)returns boolean language plpgsql security definer set search_path=cashflow,public,pg_temp as $$declare v_tenant uuid;begin select tenant_id into v_tenant from cashflow.denarius_team_invite where id=p_invite_id;if not cashflow.denarius_has_permission(v_tenant,'team.manage')then raise exception'FORBIDDEN';end if;update cashflow.denarius_team_invite set revoked_at=now()where id=p_invite_id and accepted_at is null;return found;end$$;
revoke all on cashflow.denarius_role_template,cashflow.denarius_tenant_member,cashflow.denarius_team_invite from anon,authenticated;grant select on cashflow.denarius_role_template,cashflow.denarius_tenant_member,cashflow.denarius_team_invite to authenticated;
revoke all on function cashflow.denarius_has_permission(uuid,text),cashflow.denarius_team_workspace(uuid),cashflow.create_denarius_team_invite(uuid,text,text,int),cashflow.accept_denarius_team_invite(text),cashflow.revoke_denarius_team_invite(uuid)from public,anon;grant execute on function cashflow.denarius_has_permission(uuid,text),cashflow.denarius_team_workspace(uuid),cashflow.create_denarius_team_invite(uuid,text,text,int),cashflow.accept_denarius_team_invite(text),cashflow.revoke_denarius_team_invite(uuid)to authenticated;
