-- Reconciliación de tracking: NO reejecuta el DDL original.
-- Registra 20260624120000 únicamente si todos sus objetos materiales existen.

begin;

do $$
declare
  missing text[] := array[]::text[];
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'cashflow' and table_name = 'tenant' and column_name = 'business_model'
  ) then missing := array_append(missing, 'cashflow.tenant.business_model'); end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'cashflow' and table_name = 'tenant' and column_name = 'ppm_rate'
  ) then missing := array_append(missing, 'cashflow.tenant.ppm_rate'); end if;

  if not exists (select 1 from pg_constraint where conname = 'tenant_business_model_chk')
    then missing := array_append(missing, 'tenant_business_model_chk'); end if;
  if not exists (select 1 from pg_constraint where conname = 'tenant_ppm_rate_chk')
    then missing := array_append(missing, 'tenant_ppm_rate_chk'); end if;

  if to_regclass('cashflow.idx_invoice_owner_issue') is null
    then missing := array_append(missing, 'idx_invoice_owner_issue'); end if;
  if to_regclass('cashflow.idx_invoice_owner_pending') is null
    then missing := array_append(missing, 'idx_invoice_owner_pending'); end if;
  if to_regclass('cashflow.idx_expense_owner_date') is null
    then missing := array_append(missing, 'idx_expense_owner_date'); end if;
  if to_regclass('cashflow.idx_revenue_owner_date') is null
    then missing := array_append(missing, 'idx_revenue_owner_date'); end if;
  if to_regclass('cashflow.idx_transaction_owner_date') is null
    then missing := array_append(missing, 'idx_transaction_owner_date'); end if;

  if to_regprocedure('cashflow.fmt_clp_short(numeric)') is null
    then missing := array_append(missing, 'fmt_clp_short(numeric)'); end if;
  if to_regprocedure('cashflow.metrics_pyme(uuid,text)') is null
    then missing := array_append(missing, 'metrics_pyme(uuid,text)'); end if;
  if to_regprocedure('cashflow.metrics_saas(uuid,text)') is null
    then missing := array_append(missing, 'metrics_saas(uuid,text)'); end if;

  if cardinality(missing) > 0 then
    raise exception 'No se puede reconciliar 20260624120000; faltan objetos: %', array_to_string(missing, ', ');
  end if;
end $$;

insert into supabase_migrations.schema_migrations (version, name)
values ('20260624120000', 'cashflow_business_model_and_read_rpcs')
on conflict (version) do update set name = excluded.name;

commit;
