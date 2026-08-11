-- Denarius: reducir la superficie de ejecución de RPC financieras.
-- Forward-only e idempotente respecto de grants.
--
-- PRECONDICIÓN: reconciliar primero el historial remoto de migraciones. El objeto
-- local 20260624120000 existe en producción, pero su versión no está registrada.
-- Aplicar esta migración solamente después de aprobar ese plan de convergencia.

begin;

revoke execute on function cashflow.check_and_increment_pdf_usage(integer) from public, anon;
revoke execute on function cashflow.fmt_clp_short(numeric) from public, anon;
revoke execute on function cashflow.metrics_pyme(uuid, text) from public, anon;
revoke execute on function cashflow.metrics_saas(uuid, text) from public, anon;

grant execute on function cashflow.check_and_increment_pdf_usage(integer) to authenticated, service_role;
grant execute on function cashflow.fmt_clp_short(numeric) to authenticated, service_role;
grant execute on function cashflow.metrics_pyme(uuid, text) to authenticated, service_role;
grant execute on function cashflow.metrics_saas(uuid, text) to authenticated, service_role;

insert into supabase_migrations.schema_migrations (version, name)
values ('20260806210000', 'cashflow_rpc_execute_hardening')
on conflict (version) do update set name = excluded.name;

commit;
