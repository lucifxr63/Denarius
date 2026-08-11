-- OPS-105: soporte beta estructurado y revocación urgente.
create table if not exists cashflow.beta_support_case(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references cashflow.tenant(id) on delete cascade,owner_id uuid not null references auth.users(id) on delete cascade,
 diagnostic_id text not null unique,category text not null check(category in('ACCESS','MCP','DATA_QUALITY','BILLING','SECURITY','OTHER')),
 surface text not null check(surface in('WEB','MCP_DESKTOP','MCP_CLOUD','IMPORT','OTHER')),priority text not null check(priority in('NORMAL','HIGH','URGENT')),
 status text not null default'OPEN' check(status in('OPEN','IN_PROGRESS','RESOLVED','CLOSED')),summary text check(summary is null or char_length(summary)<=500),
 response_due_at timestamptz not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),resolved_at timestamptz
);
create index if not exists idx_beta_support_case_tenant_created on cashflow.beta_support_case(tenant_id,created_at desc);
alter table cashflow.beta_support_case enable row level security;drop policy if exists cf_beta_support_case_select_own on cashflow.beta_support_case;create policy cf_beta_support_case_select_own on cashflow.beta_support_case for select to authenticated using(owner_id=auth.uid());
revoke all on cashflow.beta_support_case from public,anon,authenticated;grant select on cashflow.beta_support_case to authenticated;grant all on cashflow.beta_support_case to service_role;

create or replace function cashflow.create_beta_support_case(p_tenant_id uuid,p_category text,p_surface text,p_priority text,p_summary text default null)
returns jsonb language plpgsql security definer set search_path=cashflow,public,pg_temp as $$ declare v_uid uuid:=auth.uid();v_id uuid;v_diag text;v_due timestamptz;begin
 if not exists(select 1 from cashflow.tenant where id=p_tenant_id and owner_id=v_uid)then raise exception'tenant_not_found';end if;
 if p_category not in('ACCESS','MCP','DATA_QUALITY','BILLING','SECURITY','OTHER')or p_surface not in('WEB','MCP_DESKTOP','MCP_CLOUD','IMPORT','OTHER')or p_priority not in('NORMAL','HIGH','URGENT')then raise exception'invalid_case';end if;
 if p_summary~*'dnr_live_[0-9a-f]+' or p_summary~*'[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}'then raise exception'sensitive_content_rejected';end if;
 v_diag:='DNR-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));v_due:=now()+case p_priority when'URGENT'then interval'1 hour'when'HIGH'then interval'4 hours'else interval'24 hours'end;
 insert into cashflow.beta_support_case(tenant_id,owner_id,diagnostic_id,category,surface,priority,summary,response_due_at)values(p_tenant_id,v_uid,v_diag,p_category,p_surface,p_priority,nullif(trim(p_summary),''),v_due)returning id into v_id;
 return jsonb_build_object('id',v_id,'diagnostic_id',v_diag,'response_due_at',v_due);end $$;

create or replace function cashflow.beta_support_workspace(p_tenant_id uuid)
returns jsonb language plpgsql stable security definer set search_path=cashflow,public,pg_temp as $$ declare v_uid uuid:=auth.uid();v_cases jsonb;v_keys int;begin
 if not exists(select 1 from cashflow.tenant where id=p_tenant_id and owner_id=v_uid)then raise exception'tenant_not_found';end if;
 select count(*) into v_keys from cashflow.denarius_api_key where tenant_id=p_tenant_id and owner_id=v_uid and revoked_at is null and(expires_at is null or expires_at>now());
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'diagnostic_id',diagnostic_id,'category',category,'surface',surface,'priority',priority,'status',status,'summary',summary,'response_due_at',response_due_at,'created_at',created_at)order by created_at desc),'[]')into v_cases from(select*from cashflow.beta_support_case where tenant_id=p_tenant_id and owner_id=v_uid order by created_at desc limit 25)c;
 return jsonb_build_object('service_status','OPERATIONAL','release_id','2026-08-08-ops105','active_mcp_keys',v_keys,'sla',jsonb_build_object('URGENT','1 hora','HIGH','4 horas','NORMAL','1 día hábil'),'cases',v_cases);end $$;

create or replace function cashflow.emergency_revoke_denarius_keys(p_tenant_id uuid)
returns jsonb language plpgsql security definer set search_path=cashflow,public,pg_temp as $$ declare v_uid uuid:=auth.uid();v_count int;v_case jsonb;begin
 if not exists(select 1 from cashflow.tenant where id=p_tenant_id and owner_id=v_uid)then raise exception'tenant_not_found';end if;
 update cashflow.denarius_api_key set revoked_at=now()where tenant_id=p_tenant_id and owner_id=v_uid and revoked_at is null;get diagnostics v_count=row_count;
 v_case:=cashflow.create_beta_support_case(p_tenant_id,'SECURITY','MCP_DESKTOP','URGENT','Revocación urgente solicitada desde Denarius.');return jsonb_build_object('revoked',v_count,'case',v_case);end $$;
revoke all on function cashflow.create_beta_support_case(uuid,text,text,text,text),cashflow.beta_support_workspace(uuid),cashflow.emergency_revoke_denarius_keys(uuid)from public,anon;
grant execute on function cashflow.create_beta_support_case(uuid,text,text,text,text),cashflow.beta_support_workspace(uuid),cashflow.emergency_revoke_denarius_keys(uuid)to authenticated;
