import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  EXPLAINABLE_METRICS,
  parseToolRequest,
  projectionSummary,
  projectionAnalysis,
  runwayAndBurn,
  TOOL_JSON_SCHEMAS,
} from '../supabase/functions/denarius-tools/core.ts';

describe('denarius-tools request validation', () => {
  it('rechaza tenant_id controlado por el solicitante', () => {
    assert.throws(() => parseToolRequest({ name: 'get_cash_position', tenant_id: 'otro' }), /tenant_id no está permitido/);
  });

  it('rechaza herramientas y horizontes desconocidos', () => {
    assert.throws(() => parseToolRequest({ name: 'delete_invoice' }), /Herramienta desconocida/);
    assert.throws(() => parseToolRequest({ name: 'get_cash_projection', arguments: { horizon_days: 7 } }), /30, 90 o 365/);
  });

  it('acepta el catálogo read-only', () => {
    assert.deepEqual(parseToolRequest({ name: 'get_cash_position' }), { name: 'get_cash_position' });
    assert.deepEqual(parseToolRequest({ name: 'get_cash_projection', arguments: { horizon_days: 90 } }), {
      name: 'get_cash_projection', arguments: { horizon_days: 90 },
    });
    assert.deepEqual(parseToolRequest({ name: 'get_restricted_cash' }), { name: 'get_restricted_cash' });
    assert.deepEqual(parseToolRequest({ name: 'get_financial_summary' }), { name: 'get_financial_summary' });
    assert.deepEqual(parseToolRequest({ name: 'explain_metric', arguments: { metric: 'runway' } }), {
      name: 'explain_metric', arguments: { metric: 'runway' },
    });
  });

  it('publica esquemas cerrados y limita las metricas explicables', () => {
    assert.equal(Object.keys(TOOL_JSON_SCHEMAS).length, 14);
    assert.ok(Object.values(TOOL_JSON_SCHEMAS).every((schema) => schema.additionalProperties === false));
    assert.deepEqual(TOOL_JSON_SCHEMAS.explain_metric.properties.metric.enum, [...EXPLAINABLE_METRICS]);
    assert.throws(
      () => parseToolRequest({ name: 'explain_metric', arguments: { metric: 'customer_password' } }),
      /metric no est.* permitido/,
    );
  });
});

describe('denarius-tools projection', () => {
  it('mantiene el modelo asimétrico y expande recurrencias', () => {
    const result = projectionSummary(
      1_000_000,
      [
        { type: 'AR', status: 'PENDING', total_amount: 500_000, due_date: '2026-08-01' },
        { type: 'AP', status: 'PENDING', total_amount: 200_000, due_date: '2026-08-01' },
        { type: 'AR', status: 'PENDING', total_amount: 300_000, due_date: '2026-08-10' },
      ],
      [{ type: 'OUT', amount: 100_000, frequency: 'WEEKLY', next_date: '2026-08-06' }],
      '2026-08-06',
      30,
    );

    assert.equal(result.ending_balance, 600_000);
    assert.equal(result.lowest_balance, 600_000);
  });

  it('aplica reserva tributaria a ingresos AR y recurrentes', () => {
    const result = projectionSummary(
      0,
      [{ type: 'AR', status: 'PENDING', total_amount: 100_000, due_date: '2026-08-10' }],
      [{ type: 'IN', amount: 50_000, frequency: 'MONTHLY', next_date: '2026-08-15' }],
      '2026-08-06',
      30,
      20,
    );
    assert.equal(result.ending_balance, 120_000);
  });

  it('explica con eventos el punto mas bajo', () => {
    const result = projectionAnalysis(
      1_000_000,
      [{ type: 'AP', status: 'PENDING', total_amount: 700_000, due_date: '2026-08-10' }],
      [], '2026-08-06', 30,
    );
    assert.equal(result.summary.lowest_date, '2026-08-10');
    assert.deepEqual(result.lowest_point_events, [
      { date: '2026-08-10', kind: 'invoice', direction: 'out', amount: 700_000 },
    ]);
  });

  it('alinea burn y runway con transacciones de 90 dias y recurrencias', () => {
    const result = runwayAndBurn(
      57_667,
      [{ type: 'OUT', amount: 42_333, transaction_date: '2026-06-24' }],
      [
        { type: 'OUT', amount: 23_000, frequency: 'MONTHLY', next_date: '2026-06-23' },
        { type: 'OUT', amount: 25_000, frequency: 'MONTHLY', next_date: '2026-06-23' },
        { type: 'OUT', amount: 23_000, frequency: 'MONTHLY', next_date: '2026-06-23' },
        { type: 'OUT', amount: 10_000, frequency: 'MONTHLY', next_date: '2026-06-23' },
      ],
      '2026-08-06',
    );
    assert.equal(result.monthly_burn, 95_111);
    assert.ok(result.runway_months && Math.abs(result.runway_months - 0.6063) < 0.001);
  });
});
