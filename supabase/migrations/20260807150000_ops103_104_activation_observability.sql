-- OPS-103/104: activación derivada y salud operacional por release.
-- No almacena preguntas, argumentos, respuestas, montos ni PII.
alter table cashflow.agent_tool_audit
  add column if not exists channel text not null default 'WEB' check (channel in ('WEB','MCP_OAUTH','MCP_API_KEY')),
  add column if not exists release_id text not null default 'legacy' check (char_length(release_id) between 1 and 80);

create index if not exists idx_agent_tool_audit_release_health
  on cashflow.agent_tool_audit(release_id,created_at desc,status);

create or replace function cashflow.activation_status(p_tenant_id uuid)
returns jsonb language plpgsql stable security definer set search_path=cashflow,public,pg_temp as $$
declare v_uid uuid:=auth.uid();v_projection timestamptz;v_key timestamptz;v_mcp timestamptz;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  select financial_onboarding_completed_at into v_projection from cashflow.tenant where id=p_tenant_id and owner_id=v_uid;
  if not found then raise exception 'tenant_not_found'; end if;
  select min(created_at) into v_key from cashflow.denarius_api_key where tenant_id=p_tenant_id and owner_id=v_uid;
  select min(created_at) into v_mcp from cashflow.agent_tool_audit where tenant_id=p_tenant_id and owner_id=v_uid and status='SUCCESS';
  return jsonb_build_object(
    'first_projection_at',v_projection,
    'first_connection_at',v_key,
    'first_mcp_query_at',v_mcp,
    'projection_completed',v_projection is not null,
    'connection_created',v_key is not null,
    'mcp_query_completed',v_mcp is not null,
    'activated',v_projection is not null and v_mcp is not null,
    'time_to_first_mcp_hours',case when v_projection is not null and v_mcp is not null then round(extract(epoch from (v_mcp-v_projection))/3600,2) end
  );
end $$;

create or replace function cashflow.release_health(p_release_id text,p_since timestamptz default now()-interval '24 hours')
returns jsonb language plpgsql stable security definer set search_path=cashflow,public,pg_temp as $$
declare v_result jsonb;
begin
  if auth.role()<>'service_role' then raise exception 'forbidden'; end if;
  select jsonb_build_object(
    'release_id',p_release_id,'since',p_since,
    'requests',count(*),
    'successes',count(*) filter(where status='SUCCESS'),
    'errors',count(*) filter(where status='ERROR'),
    'rate_limited',count(*) filter(where status='RATE_LIMITED'),
    'error_rate',case when count(*)>0 then round(count(*) filter(where status='ERROR')::numeric/count(*),4) else 0 end,
    'p95_latency_ms',coalesce(percentile_cont(.95) within group(order by latency_ms),0),
    'channels',coalesce((select jsonb_object_agg(channel,total) from (select channel,count(*) total from cashflow.agent_tool_audit where release_id=p_release_id and created_at>=p_since group by channel)c),'{}'::jsonb)
  ) into v_result from cashflow.agent_tool_audit where release_id=p_release_id and created_at>=p_since;
  return v_result;
end $$;

revoke all on function cashflow.activation_status(uuid) from public,anon;
grant execute on function cashflow.activation_status(uuid) to authenticated;
revoke all on function cashflow.release_health(text,timestamptz) from public,anon,authenticated;
grant execute on function cashflow.release_health(text,timestamptz) to service_role;
