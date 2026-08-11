-- DEN-105: centro de alertas financieras calculado, sin persistir datos derivados.
create or replace function cashflow.financial_alert_center(
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
  v_model text;
  v_core jsonb;
  v_pyme jsonb;
  v_risk jsonb;
  v_renewals jsonb;
  v_cash numeric := 0;
  v_burn numeric := 0;
  v_runway numeric;
  v_restricted numeric := 0;
  v_overdue_count int := 0;
  v_overdue_amount numeric := 0;
  v_max_days int := 0;
  v_alerts jsonb := '[]'::jsonb;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  select business_model into v_model from cashflow.tenant where id=p_tenant_id and owner_id=v_uid;
  if v_model is null then raise exception 'tenant_not_found'; end if;

  v_core := cashflow.financial_core_metrics(p_tenant_id,p_as_of);
  v_cash := coalesce((v_core->>'current_cash')::numeric,0);
  v_burn := coalesce((v_core->>'monthly_burn')::numeric,0);
  v_runway := (v_core->>'runway_months')::numeric;

  if v_cash < 0 then
    v_alerts := v_alerts || jsonb_build_array(jsonb_build_object('id','negative-cash','kind','CASH','severity','CRITICAL','title','Caja en negativo','message','La caja consolidada está bajo cero.','amount',v_cash,'action_label','Revisar movimientos','deep_link','/operations#transactions','evidence',jsonb_build_object('current_cash',v_cash,'as_of',p_as_of)));
  end if;
  if v_runway is not null and v_runway < 6 then
    v_alerts := v_alerts || jsonb_build_array(jsonb_build_object('id','low-runway','kind','RUNWAY','severity',case when v_runway<3 then 'CRITICAL' else 'WARNING' end,'title','Runway bajo','message',case when v_runway<3 then 'Quedan menos de 3 meses de caja al burn actual.' else 'Quedan menos de 6 meses de caja al burn actual.' end,'amount',v_burn,'action_label','Revisar proyección','deep_link','/dashboard#cash-projection','evidence',jsonb_build_object('runway_months',round(v_runway,2),'monthly_burn',v_burn,'current_cash',v_cash)));
  end if;

  select count(*),coalesce(sum(total_amount),0),coalesce(max(p_as_of-due_date),0)
  into v_overdue_count,v_overdue_amount,v_max_days
  from cashflow.invoice where tenant_id=p_tenant_id and owner_id=v_uid and type='AR' and status='PENDING' and due_date<p_as_of;
  if v_overdue_count>0 then
    v_alerts := v_alerts || jsonb_build_array(jsonb_build_object('id','overdue-receivables','kind','RECEIVABLES','severity',case when v_max_days>=30 then 'CRITICAL' else 'WARNING' end,'title','Cobros vencidos','message',v_overdue_count||' factura(s) por cobrar están vencidas.','amount',v_overdue_amount,'due_date',(p_as_of-v_max_days)::text,'action_label','Gestionar cobranza','deep_link','/operations#overdue-invoices','evidence',jsonb_build_object('count',v_overdue_count,'amount',v_overdue_amount,'maximum_days_overdue',v_max_days)));
  end if;

  if v_model='pyme-tradicional' then
    v_pyme := cashflow.metrics_pyme(p_tenant_id,to_char(p_as_of,'YYYY-MM'));
    v_restricted := coalesce((v_pyme#>>'{restrictedCashWidget,value}')::numeric,0);
    if v_restricted>0 and v_restricted>greatest(v_cash*.5,0) then
      v_alerts := v_alerts || jsonb_build_array(jsonb_build_object('id','tax-reserve','kind','TAX','severity',case when v_restricted>v_cash then 'CRITICAL' else 'WARNING' end,'title','Reserva tributaria exigente','message',case when v_restricted>v_cash then 'La reserva estimada supera la caja disponible.' else 'La reserva estimada consume más del 50% de la caja.' end,'amount',v_restricted,'action_label','Revisar caja restringida','deep_link','/dashboard#restricted-cash','evidence',jsonb_build_object('restricted_cash',v_restricted,'current_cash',v_cash)));
    end if;
  elsif v_model='startup-saas' then
    v_risk := cashflow.saas_customer_risk(p_tenant_id);
    if coalesce((v_risk->>'top_customer_concentration')::numeric,0)>=.4 then
      v_alerts := v_alerts || jsonb_build_array(jsonb_build_object('id','customer-concentration','kind','CONCENTRATION','severity','WARNING','title','Alta concentración de ingresos','message','Un cliente representa al menos 40% del MRR activo.','amount',coalesce((v_risk->>'total_mrr')::numeric,0),'action_label','Revisar salud de clientes','deep_link','/subscriptions#customer-health','evidence',jsonb_build_object('top_customer_share',v_risk->'top_customer_concentration','at_risk_mrr',v_risk->'at_risk_mrr')));
    end if;
    v_renewals := cashflow.saas_renewal_workspace(p_tenant_id);
    if coalesce((v_renewals->>'overdue')::int,0)>0 then
      v_alerts := v_alerts || jsonb_build_array(jsonb_build_object('id','overdue-renewals','kind','RENEWALS','severity','CRITICAL','title','Renovaciones vencidas','message',(v_renewals->>'overdue')||' renovación(es) requieren seguimiento inmediato.','amount',coalesce((v_renewals->>'mrr_due_30_days')::numeric,0),'action_label','Abrir agenda de renovaciones','deep_link','/subscriptions#renewals','evidence',jsonb_build_object('overdue',v_renewals->'overdue','due_30_days',v_renewals->'due_30_days')));
    elsif coalesce((v_renewals->>'due_30_days')::int,0)>0 then
      v_alerts := v_alerts || jsonb_build_array(jsonb_build_object('id','upcoming-renewals','kind','RENEWALS','severity','WARNING','title','Renovaciones próximas','message',(v_renewals->>'due_30_days')||' renovación(es) vencen en los próximos 30 días.','amount',coalesce((v_renewals->>'mrr_due_30_days')::numeric,0),'action_label','Preparar renovaciones','deep_link','/subscriptions#renewals','evidence',jsonb_build_object('due_30_days',v_renewals->'due_30_days')));
    end if;
  end if;

  select coalesce(jsonb_agg(value order by case value->>'severity' when 'CRITICAL' then 1 when 'WARNING' then 2 else 3 end,value->>'kind'),'[]'::jsonb) into v_alerts from jsonb_array_elements(v_alerts);
  return jsonb_build_object('as_of',p_as_of,'business_model',v_model,'summary',jsonb_build_object('critical',(select count(*) from jsonb_array_elements(v_alerts) a where a->>'severity'='CRITICAL'),'warning',(select count(*) from jsonb_array_elements(v_alerts) a where a->>'severity'='WARNING'),'info',(select count(*) from jsonb_array_elements(v_alerts) a where a->>'severity'='INFO'),'total',jsonb_array_length(v_alerts)),'alerts',v_alerts);
end;
$$;
revoke all on function cashflow.financial_alert_center(uuid,date) from public,anon;
grant execute on function cashflow.financial_alert_center(uuid,date) to authenticated,service_role;
