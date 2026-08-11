-- Auditoría mínima y rate limiting para denarius-tools.
-- No almacena argumentos, respuestas ni montos financieros.

begin;

create table if not exists cashflow.agent_tool_audit (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references cashflow.tenant(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  tool_name text not null,
  status text not null check (status in ('SUCCESS', 'ERROR', 'RATE_LIMITED')),
  latency_ms integer not null check (latency_ms >= 0),
  created_at timestamptz not null default now(),
  constraint agent_tool_audit_tool_chk check (tool_name in (
    'get_cash_position',
    'get_runway_and_burn',
    'list_overdue_invoices',
    'get_cash_projection',
    'get_restricted_cash',
    'explain_metric',
    'get_financial_summary'
  ))
);

create index if not exists idx_agent_tool_audit_rate_limit
  on cashflow.agent_tool_audit (owner_id, tenant_id, created_at desc);

alter table cashflow.agent_tool_audit enable row level security;

drop policy if exists cf_agent_tool_audit_select_own on cashflow.agent_tool_audit;
create policy cf_agent_tool_audit_select_own
  on cashflow.agent_tool_audit for select to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists cf_agent_tool_audit_insert_own on cashflow.agent_tool_audit;
create policy cf_agent_tool_audit_insert_own
  on cashflow.agent_tool_audit for insert to authenticated
  with check (owner_id = (select auth.uid()));

revoke all on cashflow.agent_tool_audit from public, anon;
grant select, insert on cashflow.agent_tool_audit to authenticated;
grant all on cashflow.agent_tool_audit to service_role;

insert into supabase_migrations.schema_migrations (version, name)
values ('20260806220000', 'denarius_tool_audit')
on conflict (version) do update set name = excluded.name;

commit;
