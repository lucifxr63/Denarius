begin;

alter table cashflow.agent_tool_audit
  drop constraint if exists agent_tool_audit_tool_name_check;

alter table cashflow.agent_tool_audit
  add constraint agent_tool_audit_tool_name_check check (tool_name in (
    'get_cash_position',
    'get_runway_and_burn',
    'list_overdue_invoices',
    'get_cash_projection',
    'get_restricted_cash',
    'explain_metric',
    'get_financial_summary',
    'explain_projection_point',
    'simulate_scenario'
  ));

insert into supabase_migrations.schema_migrations(version, name, statements)
values ('20260806230000', 'denarius_tool_catalog_v2', array['agent tool audit catalog expanded'])
on conflict (version) do nothing;

commit;
