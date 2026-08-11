begin;
grant usage on schema cashflow to service_role;
insert into supabase_migrations.schema_migrations(version,name,statements)
values('20260807082000','denarius_service_schema_usage',array['service_role usage on cashflow schema for MCP key resolution'])
on conflict(version) do nothing;
commit;
