begin;
grant select on cashflow.tenant,cashflow.bank_account,cashflow.invoice,cashflow.recurring_transaction to service_role;
grant select,insert on cashflow.agent_tool_audit to service_role;
insert into supabase_migrations.schema_migrations(version,name,statements)
values('20260807083000','denarius_service_table_grants',array['minimal read-only financial grants and audit insert for MCP gateway'])
on conflict(version) do nothing;
commit;
