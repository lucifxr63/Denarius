import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const startupLayout = JSON.parse(readFileSync('src/config/dashboards/startupLayout.json', 'utf8')) as {
  widgets: Array<{ widgetId: string }>;
};
const widgetRegistry = readFileSync('src/components/dashboard/widgets.tsx', 'utf8');
const financialTruthSql = readFileSync('supabase/migrations/20260807010000_financial_core_metrics.sql', 'utf8');
const subscriptionsSql = readFileSync('supabase/migrations/20260807020000_saas_subscriptions.sql', 'utf8');
const lifecycleSql = readFileSync('supabase/migrations/20260807030000_saas_subscription_lifecycle.sql', 'utf8');
const retentionSql = readFileSync('supabase/migrations/20260807040000_saas_retention_cohorts.sql', 'utf8');
const riskSql = readFileSync('supabase/migrations/20260807050000_saas_customer_risk.sql', 'utf8');
const renewalsSql = readFileSync('supabase/migrations/20260807060000_saas_renewals.sql', 'utf8');

describe('contrato E09 por modelo', () => {
  it('registra todos los widgets declarados por Startup SaaS', () => {
    for (const widget of startupLayout.widgets) {
      assert.match(widgetRegistry, new RegExp(`\\b${widget.widgetId}:`), `${widget.widgetId} no está registrado`);
    }
  });

  it('expone métricas SaaS de crecimiento y eficiencia', () => {
    const ids = startupLayout.widgets.map((widget) => widget.widgetId);
    assert.ok(ids.includes('grossBurnWidget'));
    assert.ok(ids.includes('mrrGrowthWidget'));
    assert.ok(ids.includes('burnMultipleWidget'));
    assert.ok(ids.includes('newMrrWidget'));
    assert.ok(ids.includes('churnedMrrWidget'));
    assert.ok(ids.includes('activeCustomersWidget'));
  });

  it('protege clientes, suscripciones y eventos MRR por propietario', () => {
    assert.match(subscriptionsSql, /create table if not exists cashflow\.saas_subscription/);
    assert.match(subscriptionsSql, /create table if not exists cashflow\.saas_mrr_event/);
    assert.match(subscriptionsSql, /event_type in \('NEW','EXPANSION','CONTRACTION','CHURN','REACTIVATION'\)/);
    assert.match(subscriptionsSql, /using \(owner_id\s*=\s*auth\.uid\(\)\)/);
    assert.match(subscriptionsSql, /revoke all on function cashflow\.saas_growth_metrics/);
  });

  it('registra el ciclo de vida sin permitir editar el historial', () => {
    assert.match(lifecycleSql, /create or replace function cashflow\.update_saas_subscription/);
    assert.match(lifecycleSql, /subscription_change_has_no_mrr_effect/);
    assert.match(lifecycleSql, /previous_mrr, resulting_mrr, previous_plan, resulting_plan, note/);
    assert.match(lifecycleSql, /create or replace function cashflow\.saas_subscription_history/);
    assert.doesNotMatch(lifecycleSql, /delete from cashflow\.saas_mrr_event/);
  });

  it('calcula retención sin inflarla con nuevo MRR', () => {
    assert.match(retentionSql, /create or replace function cashflow\.saas_retention_metrics/);
    assert.match(retentionSql, /opening_event\.effective_date < v_start/);
    assert.match(retentionSql, /v_opening_mrr \+ v_expansion - v_contraction - v_churn/);
    assert.match(retentionSql, /v_opening_mrr - v_contraction - v_churn/);
    assert.match(retentionSql, /mrr_retention/);
  });
  it('explica riesgo y concentración sin modelos opacos',()=>{assert.match(riskSql,/create or replace function cashflow\.saas_customer_risk/);assert.match(riskSql,/recent_contraction/);assert.match(riskSql,/top_customer_concentration/);assert.match(riskSql,/reasons/);});
  it('mantiene renovaciones como tareas internas auditables',()=>{assert.match(renewalsSql,/renewal_status in \('PENDING','IN_PROGRESS','RENEWED','WILL_NOT_RENEW'\)/);assert.match(renewalsSql,/saas_renewal_workspace/);assert.match(renewalsSql,/suggested_action/);assert.doesNotMatch(renewalsSql,/send|email|webhook/i);});


  it('hace que metrics_saas consuma la fuente financiera central', () => {
    assert.match(financialTruthSql, /financial_core_metrics\(p_tenant_id, current_date\)/);
    assert.match(financialTruthSql, /Burn neto · últimos 90 días \+ recurrencias/);
  });
});
