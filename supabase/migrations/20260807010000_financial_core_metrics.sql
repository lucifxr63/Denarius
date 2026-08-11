create or replace function cashflow.financial_core_metrics(
  p_tenant_id uuid,
  p_as_of date default current_date
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = cashflow, public
as $$
declare
  v_uid uuid := auth.uid();
  v_cash numeric := 0;
  v_tax_factor numeric := 1;
  v_incoming_90d numeric := 0;
  v_outgoing_90d numeric := 0;
  v_recurring_in numeric := 0;
  v_recurring_out numeric := 0;
  v_monthly_net numeric := 0;
  v_gross_burn numeric := 0;
  v_net_burn numeric := 0;
  v_runway numeric;
begin
  if v_uid is null then return '{}'::jsonb; end if;

  select 1 - least(greatest(default_tax_rate, 0), 100) / 100
  into v_tax_factor
  from cashflow.tenant
  where id = p_tenant_id and owner_id = v_uid;
  if v_tax_factor is null then return '{}'::jsonb; end if;

  select coalesce(sum(current_balance), 0)
  into v_cash
  from cashflow.bank_account
  where tenant_id = p_tenant_id and owner_id = v_uid;

  select
    coalesce(sum(t.amount) filter (where t.type = 'IN'), 0),
    coalesce(sum(t.amount) filter (where t.type = 'OUT'), 0)
  into v_incoming_90d, v_outgoing_90d
  from cashflow.transaction t
  join cashflow.bank_account a on a.id = t.account_id
  where a.tenant_id = p_tenant_id and a.owner_id = v_uid and t.owner_id = v_uid
    and t.transaction_date >= p_as_of - 90 and t.transaction_date <= p_as_of;

  select
    coalesce(sum(case frequency
      when 'WEEKLY' then amount * 52 / 12
      when 'MONTHLY' then amount
      when 'QUARTERLY' then amount / 3
      when 'YEARLY' then amount / 12
      else 0 end) filter (where type = 'IN'), 0),
    coalesce(sum(case frequency
      when 'WEEKLY' then amount * 52 / 12
      when 'MONTHLY' then amount
      when 'QUARTERLY' then amount / 3
      when 'YEARLY' then amount / 12
      else 0 end) filter (where type = 'OUT'), 0)
  into v_recurring_in, v_recurring_out
  from cashflow.recurring_transaction
  where tenant_id = p_tenant_id and owner_id = v_uid;

  v_monthly_net := (v_incoming_90d * v_tax_factor - v_outgoing_90d) / 3
    + v_recurring_in * v_tax_factor - v_recurring_out;
  v_gross_burn := v_outgoing_90d / 3 + v_recurring_out;
  v_net_burn := greatest(0, -v_monthly_net);
  v_runway := case when v_net_burn > 0 then v_cash / v_net_burn else null end;

  return jsonb_build_object(
    'current_cash', v_cash,
    'gross_burn', v_gross_burn,
    'monthly_burn', v_net_burn,
    'monthly_net', v_monthly_net,
    'runway_months', v_runway,
    'period_start', (p_as_of - 90)::text,
    'period_end', p_as_of::text
  );
end;
$$;

create or replace function cashflow.metrics_saas(
  p_tenant_id uuid,
  p_period text default to_char(now(), 'YYYY-MM')
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = cashflow, public
as $$
declare
  v_uid uuid := auth.uid();
  v_start date := to_date(p_period || '-01', 'YYYY-MM-DD');
  v_end date := (v_start + interval '1 month')::date;
  v_prev date := (v_start - interval '1 month')::date;
  v_core jsonb;
  v_cash numeric := 0;
  v_gross_burn numeric := 0;
  v_burn numeric := 0;
  v_runway numeric;
  v_mrr numeric := 0;
  v_mrr_prev numeric := 0;
  v_mrr_growth numeric := 0;
  v_burn_multiple numeric;
  v_trend jsonb;
begin
  if not exists (select 1 from cashflow.tenant where id = p_tenant_id and owner_id = v_uid) then
    return '{}'::jsonb;
  end if;

  v_core := cashflow.financial_core_metrics(p_tenant_id, current_date);
  v_cash := coalesce((v_core->>'current_cash')::numeric, 0);
  v_gross_burn := coalesce((v_core->>'gross_burn')::numeric, 0);
  v_burn := coalesce((v_core->>'monthly_burn')::numeric, 0);
  v_runway := (v_core->>'runway_months')::numeric;

  select
    coalesce(sum(net_income_clp) filter (where record_date >= v_start and record_date < v_end), 0),
    coalesce(sum(net_income_clp) filter (where record_date >= v_prev and record_date < v_start), 0)
  into v_mrr, v_mrr_prev
  from cashflow.revenue
  where owner_id = v_uid and tenant_id = p_tenant_id
    and record_date >= v_prev and record_date < v_end;

  v_mrr_growth := v_mrr - v_mrr_prev;
  v_burn_multiple := case when v_mrr_growth > 0 then v_burn / v_mrr_growth else null end;

  select coalesce(jsonb_agg(monthly_burn order by month), '[]'::jsonb) into v_trend
  from (
    select gs::date as month,
      greatest(0,
        coalesce((select sum(t.amount) from cashflow.transaction t
          join cashflow.bank_account a on a.id = t.account_id
          where a.tenant_id = p_tenant_id and a.owner_id = v_uid and t.owner_id = v_uid
            and t.type = 'OUT' and t.transaction_date >= gs and t.transaction_date < gs + interval '1 month'), 0)
        - coalesce((select sum(t.amount) from cashflow.transaction t
          join cashflow.bank_account a on a.id = t.account_id
          where a.tenant_id = p_tenant_id and a.owner_id = v_uid and t.owner_id = v_uid
            and t.type = 'IN' and t.transaction_date >= gs and t.transaction_date < gs + interval '1 month'), 0)
      ) as monthly_burn
    from generate_series(v_start - interval '5 months', v_start, interval '1 month') gs
  ) history;

  return jsonb_build_object(
    'burnRateWidget', jsonb_build_object(
      'value', v_burn, 'display', cashflow.fmt_clp_short(v_burn) || '/mes',
      'tone', case when v_burn > 0 then 'negative' else 'positive' end,
      'note', 'Burn neto · últimos 90 días + recurrencias'),
    'grossBurnWidget', jsonb_build_object(
      'value', v_gross_burn, 'display', cashflow.fmt_clp_short(v_gross_burn) || '/mes',
      'tone', 'neutral', 'note', 'Salidas promedio + recurrencias'),
    'runwayWidget', jsonb_build_object(
      'value', v_runway,
      'display', case when v_runway is null then '∞' when v_runway > 24 then '> 24 meses' else replace(round(v_runway, 1)::text, '.', ',') || ' meses' end,
      'tone', case when v_runway is not null and v_runway < 6 then 'warning' else 'neutral' end,
      'note', 'Caja actual ÷ burn neto'),
    'mrrWidget', jsonb_build_object(
      'value', v_mrr, 'display', cashflow.fmt_clp_short(v_mrr),
      'delta', case when v_mrr_prev > 0 then round((v_mrr - v_mrr_prev) / v_mrr_prev, 4) else null end,
      'tone', 'positive', 'note', 'Ingreso recurrente mensual'),
    'mrrGrowthWidget', jsonb_build_object(
      'value', v_mrr_growth, 'display', cashflow.fmt_clp_short(v_mrr_growth),
      'tone', case when v_mrr_growth > 0 then 'positive' when v_mrr_growth < 0 then 'negative' else 'neutral' end,
      'note', 'MRR actual − mes anterior'),
    'burnMultipleWidget', jsonb_build_object(
      'value', v_burn_multiple,
      'display', case when v_burn_multiple is null then 'Sin crecimiento' else replace(round(v_burn_multiple, 1)::text, '.', ',') || '×' end,
      'tone', case when v_burn_multiple is null then 'neutral' when v_burn_multiple <= 1 then 'positive' when v_burn_multiple <= 2 then 'warning' else 'negative' end,
      'note', 'Burn neto ÷ crecimiento de MRR'),
    'burnTrendWidget', jsonb_build_object(
      'display', cashflow.fmt_clp_short(v_burn), 'tone', 'negative',
      'note', 'Burn mensual observado · 6 meses', 'trend', v_trend),
    'cashBalanceWidget', jsonb_build_object(
      'value', v_cash, 'display', cashflow.fmt_clp_short(v_cash),
      'tone', 'neutral', 'note', 'Caja en banco')
  );
end;
$$;

revoke all on function cashflow.financial_core_metrics(uuid, date) from public;
grant execute on function cashflow.financial_core_metrics(uuid, date) to authenticated;
grant execute on function cashflow.metrics_saas(uuid, text) to authenticated;
