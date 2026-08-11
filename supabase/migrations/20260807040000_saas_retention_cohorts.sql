create or replace function cashflow.saas_retention_metrics(
  p_tenant_id uuid,
  p_months integer default 6
)
returns jsonb language plpgsql stable security invoker set search_path = cashflow, public as $$
declare
  v_uid uuid := auth.uid();
  v_months integer := greatest(1, least(coalesce(p_months, 6), 24));
  v_start date;
  v_end date;
  v_opening_mrr numeric;
  v_expansion numeric;
  v_contraction numeric;
  v_churn numeric;
  v_opening_customers integer;
  v_churned_customers integer;
  v_periods jsonb := '[]'::jsonb;
  v_cohorts jsonb;
  i integer;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from cashflow.tenant where id = p_tenant_id and owner_id = v_uid) then
    raise exception 'tenant_not_found';
  end if;

  for i in reverse v_months - 1..0 loop
    v_start := (date_trunc('month', current_date) - make_interval(months => i))::date;
    v_end := (v_start + interval '1 month')::date;

    select coalesce(sum(amount_delta), 0) into v_opening_mrr
    from cashflow.saas_mrr_event
    where tenant_id = p_tenant_id and owner_id = v_uid and effective_date < v_start;

    select
      coalesce(sum(outer_e.amount_delta) filter(where outer_e.event_type = 'EXPANSION'), 0),
      abs(coalesce(sum(outer_e.amount_delta) filter(where outer_e.event_type = 'CONTRACTION'), 0)),
      abs(coalesce(sum(outer_e.amount_delta) filter(where outer_e.event_type = 'CHURN'), 0))
    into v_expansion, v_contraction, v_churn
    from cashflow.saas_mrr_event outer_e
    where outer_e.tenant_id = p_tenant_id and outer_e.owner_id = v_uid
      and outer_e.effective_date >= v_start and outer_e.effective_date < v_end
      and (select coalesce(sum(opening_event.amount_delta), 0)
           from cashflow.saas_mrr_event opening_event
           where opening_event.subscription_id = outer_e.subscription_id
             and opening_event.owner_id = v_uid and opening_event.effective_date < v_start) > 0;

    select count(distinct s.customer_id) into v_opening_customers
    from cashflow.saas_subscription s
    where s.tenant_id = p_tenant_id and s.owner_id = v_uid
      and (select coalesce(sum(e.amount_delta), 0) from cashflow.saas_mrr_event e
           where e.subscription_id = s.id and e.owner_id = v_uid and e.effective_date < v_start) > 0;

    select count(distinct s.customer_id) into v_churned_customers
    from cashflow.saas_subscription s
    join cashflow.saas_mrr_event e on e.subscription_id = s.id
    where s.tenant_id = p_tenant_id and s.owner_id = v_uid and e.owner_id = v_uid
      and e.event_type = 'CHURN' and e.effective_date >= v_start and e.effective_date < v_end
      and (select coalesce(sum(e2.amount_delta), 0) from cashflow.saas_mrr_event e2
           join cashflow.saas_subscription s2 on s2.id = e2.subscription_id
           where s2.customer_id = s.customer_id and s2.tenant_id = p_tenant_id
             and e2.owner_id = v_uid and e2.effective_date < v_end) <= 0;

    v_periods := v_periods || jsonb_build_array(jsonb_build_object(
      'period', to_char(v_start, 'YYYY-MM'), 'opening_mrr', v_opening_mrr,
      'expansion_mrr', v_expansion, 'contraction_mrr', v_contraction, 'churned_mrr', v_churn,
      'nrr', case when v_opening_mrr > 0 then greatest(0, (v_opening_mrr + v_expansion - v_contraction - v_churn) / v_opening_mrr) else null end,
      'grr', case when v_opening_mrr > 0 then greatest(0, least(1, (v_opening_mrr - v_contraction - v_churn) / v_opening_mrr)) else null end,
      'opening_customers', v_opening_customers, 'churned_customers', v_churned_customers,
      'logo_churn', case when v_opening_customers > 0 then v_churned_customers::numeric / v_opening_customers else null end
    ));
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object(
    'cohort', cohort_month, 'customers', customers, 'starting_mrr', starting_mrr,
    'current_mrr', current_mrr,
    'mrr_retention', case when starting_mrr > 0 then greatest(0, current_mrr / starting_mrr) else null end
  ) order by cohort_month desc), '[]'::jsonb) into v_cohorts
  from (
    select to_char(date_trunc('month', s.started_at), 'YYYY-MM') cohort_month,
      count(distinct s.customer_id) customers,
      coalesce(sum((select coalesce(sum(e.amount_delta), 0) from cashflow.saas_mrr_event e
                    where e.subscription_id = s.id and e.owner_id = v_uid and e.event_type = 'NEW')), 0) starting_mrr,
      coalesce(sum((select coalesce(sum(e.amount_delta), 0) from cashflow.saas_mrr_event e
                    where e.subscription_id = s.id and e.owner_id = v_uid and e.effective_date <= current_date)), 0) current_mrr
    from cashflow.saas_subscription s
    where s.tenant_id = p_tenant_id and s.owner_id = v_uid
    group by date_trunc('month', s.started_at)
    order by date_trunc('month', s.started_at) desc
    limit 24
  ) cohorts;

  return jsonb_build_object(
    'current', coalesce(v_periods -> (jsonb_array_length(v_periods) - 1), '{}'::jsonb),
    'periods', v_periods,
    'cohorts', v_cohorts
  );
end $$;

revoke all on function cashflow.saas_retention_metrics(uuid,integer) from public;
grant execute on function cashflow.saas_retention_metrics(uuid,integer) to authenticated;
