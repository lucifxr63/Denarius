import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { executeFinancialTool } from '../src/lib/financial-tools.ts';

const context = {
  tenantId: '00000000-0000-4000-8000-000000000001',
  userId: '00000000-0000-4000-8000-000000000002',
  asOf: '2026-08-06',
  currency: 'CLP',
};

const provider = {
  async getCashPosition() {
    return { current_cash: 12_400_000, restricted_cash: 2_000_000, available_cash: 10_400_000 };
  },
  async getRunwayAndBurn() {
    return { monthly_burn: 3_100_000, runway_months: 4, period_start: '2026-05-09', period_end: '2026-08-06' };
  },
  async listOverdueInvoices() {
    return [{ id: 'invoice-1', contact_name: 'Cliente Demo', due_date: '2026-07-20', total_amount: 1_400_000, days_overdue: 17 }];
  },
  async getCashProjection(_context, horizonDays) {
    return { horizon_days: horizonDays, lowest_balance: 3_000_000, lowest_date: '2026-09-30', ending_balance: 4_200_000 };
  },
  async getRestrictedCash() { return { restricted_cash: 2_000_000 }; },
  async explainMetric(_context, metric) { return { metric, value: 1 }; },
  async getFinancialSummary() { return { current_cash: 12_400_000, overdue_count: 1 }; },
  async explainProjectionPoint() { return { summary: { lowest_balance: 1 }, lowest_point_events: [] }; },
  async simulateScenario() { return { persisted: false, baseline: {}, result: {} }; },
};

describe('contrato de herramientas financieras read-only', () => {
  it('adjunta tenant, fecha de corte, moneda y fuentes', async () => {
    const result = await executeFinancialTool({ name: 'get_cash_position' }, context, provider);

    assert.equal(result.tenant_id, context.tenantId);
    assert.equal(result.as_of, '2026-08-06');
    assert.equal(result.currency, 'CLP');
    assert.ok(result.sources.length >= 1);
    assert.equal(result.confidence, 'high');
  });

  it('no acepta contexto sin identidad resuelta', async () => {
    await assert.rejects(
      executeFinancialTool({ name: 'get_cash_position' }, { ...context, tenantId: '' }, provider),
      /Contexto autenticado incompleto/,
    );
  });

  it('limita la proyección a horizontes explícitos', async () => {
    await assert.rejects(
      executeFinancialTool(
        { name: 'get_cash_projection', arguments: { horizon_days: 7 } },
        context,
        provider,
      ),
      /horizon_days debe ser 30, 90 o 365/,
    );
  });

  it('no permite que la solicitud reemplace el tenant del contexto', async () => {
    const request = { name: 'list_overdue_invoices', arguments: { tenant_id: 'otro-tenant' } };
    const result = await executeFinancialTool(request, context, provider);
    assert.equal(result.tenant_id, context.tenantId);
  });
});
