-- DEN-124: telemetría cerrada sin campos libres, montos, preguntas o PII.
create table if not exists cashflow.denarius_experience_event(
 id bigint generated always as identity primary key,tenant_id uuid references cashflow.tenant(id) on delete cascade,actor_id uuid not null references auth.users(id) on delete cascade,
 event_name text not null check(event_name in('PAGE_VIEWED','DEMO_STARTED','LEARNING_OPENED','ALERTS_OPENED','ACTION_PLAN_OPENED','CLOSE_OPENED','CLOSE_COMPLETED','MCP_OPENED','MCP_KEY_CREATED','TEAM_OPENED')),
 surface text not null check(surface in('DASHBOARD','OPERATIONS','ALERTS','ACTION_PLAN','WEEKLY_CLOSE','MCP','LEARNING','DEMO','TEAM','OTHER')),
 business_model text check(business_model in('pyme-tradicional','startup-saas')),created_at timestamptz not null default now()
);
create index if not exists denarius_experience_event_funnel on cashflow.denarius_experience_event(created_at desc,event_name,business_model);
alter table cashflow.denarius_experience_event enable row level security;
revoke all on cashflow.denarius_experience_event from public,anon,authenticated;grant all on cashflow.denarius_experience_event to service_role;

create or replace function cashflow.track_denarius_experience(p_event_name text,p_surface text,p_tenant_id uuid default null)returns void language plpgsql security definer set search_path=cashflow,public,pg_temp as $$
declare v_model text;begin if auth.uid()is null then raise exception'AUTH_REQUIRED';end if;
 if p_event_name not in('PAGE_VIEWED','DEMO_STARTED','LEARNING_OPENED','ALERTS_OPENED','ACTION_PLAN_OPENED','CLOSE_OPENED','CLOSE_COMPLETED','MCP_OPENED','MCP_KEY_CREATED','TEAM_OPENED')then raise exception'INVALID_EVENT';end if;
 if p_surface not in('DASHBOARD','OPERATIONS','ALERTS','ACTION_PLAN','WEEKLY_CLOSE','MCP','LEARNING','DEMO','TEAM','OTHER')then raise exception'INVALID_SURFACE';end if;
 if p_tenant_id is not null then select business_model into v_model from cashflow.tenant where id=p_tenant_id and(owner_id=auth.uid()or cashflow.denarius_has_permission(id,'financial.read'));if not found then raise exception'TENANT_NOT_FOUND';end if;end if;
 insert into cashflow.denarius_experience_event(tenant_id,actor_id,event_name,surface,business_model)values(p_tenant_id,auth.uid(),p_event_name,p_surface,v_model);end$$;

create or replace function cashflow.denarius_beta_experience(p_days int default 30)returns jsonb language plpgsql stable security definer set search_path=cashflow,public,pg_temp as $$
declare v_result jsonb;begin if coalesce(auth.jwt()->'app_metadata'->>'denarius_role','')<>'platform_admin'then raise exception'ADMIN_REQUIRED';end if;
 with e as(select*from cashflow.denarius_experience_event where created_at>=now()-make_interval(days=>greatest(1,least(p_days,90)))),stages as(select*from(values('Visitó Denarius','PAGE_VIEWED',1),('Abrió alertas','ALERTS_OPENED',2),('Abrió plan','ACTION_PLAN_OPENED',3),('Abrió cierre','CLOSE_OPENED',4),('Completó cierre','CLOSE_COMPLETED',5),('Abrió MCP','MCP_OPENED',6))v(label,event_name,step))
 select jsonb_build_object('days',greatest(1,least(p_days,90)),'actors',(select count(distinct actor_id)from e),'events',(select count(*)from e),'funnel',(select coalesce(jsonb_agg(jsonb_build_object('label',s.label,'event_name',s.event_name,'actors',(select count(distinct actor_id)from e where e.event_name=s.event_name))order by s.step),'[]')from stages s),'surfaces',(select coalesce(jsonb_agg(jsonb_build_object('surface',surface,'events',total)order by total desc),'[]')from(select surface,count(*)total from e group by surface)x),'models',(select coalesce(jsonb_agg(jsonb_build_object('model',coalesce(business_model,'sin_modelo'),'actors',actors)),'[]')from(select business_model,count(distinct actor_id)actors from e group by business_model)m))into v_result;return v_result;end$$;
revoke all on function cashflow.track_denarius_experience(text,text,uuid),cashflow.denarius_beta_experience(int)from public,anon;grant execute on function cashflow.track_denarius_experience(text,text,uuid),cashflow.denarius_beta_experience(int)to authenticated;
