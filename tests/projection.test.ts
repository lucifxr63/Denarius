import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  aggregate,
  buildDailyProjection,
  computeKpis,
  monthlyEquivalent,
  overdueReceivables,
  phantomEvents,
  restrictedTax,
} from '../src/lib/projection.ts';

type Invoice = Parameters<typeof buildDailyProjection>[1][number];
type Recurring = Parameters<typeof phantomEvents>[0][number];
type Transaction = Parameters<typeof computeKpis>[1][number];

const TODAY = new Date('2026-08-06T12:00:00-04:00');

function invoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'invoice-1',
    tenant_id: 'tenant-1',
    owner_id: 'owner-1',
    type: 'AR',
    total_amount: 100_000,
    currency: 'CLP',
    issue_date: '2026-08-01',
    due_date: '2026-08-10',
    contact_name: null,
    source_system: 'MANUAL',
    external_id: null,
    status: 'PENDING',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    ...overrides,
  };
}

function recurring(overrides: Partial<Recurring> = {}): Recurring {
  return {
    id: 'recurring-1',
    tenant_id: 'tenant-1',
    owner_id: 'owner-1',
    name: 'Arriendo',
    amount: 300_000,
    currency: 'CLP',
    frequency: 'MONTHLY',
    next_date: '2026-08-10',
    type: 'OUT',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    ...overrides,
  };
}

function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'transaction-1',
    account_id: 'account-1',
    owner_id: 'owner-1',
    amount: 300_000,
    category: null,
    transaction_date: '2026-08-01',
    type: 'OUT',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    ...overrides,
  };
}

describe('modelo asimétrico de vencimientos', () => {
  it('mueve una cuenta por pagar vencida a hoy', () => {
    const points = buildDailyProjection(
      1_000_000,
      [invoice({ type: 'AP', due_date: '2026-08-01', total_amount: 250_000 })],
      TODAY,
      10,
    );

    assert.equal(points[0].balance, 750_000);
  });

  it('excluye una cuenta por cobrar vencida de la proyección', () => {
    const overdue = invoice({ due_date: '2026-08-01' });
    const points = buildDailyProjection(1_000_000, [overdue], TODAY, 10);

    assert.equal(points.at(-1)?.balance, 1_000_000);
    assert.deepEqual(overdueReceivables([overdue], TODAY), [overdue]);
  });

  it('ignora facturas pagadas o canceladas', () => {
    const points = buildDailyProjection(
      1_000_000,
      [invoice({ status: 'PAID' }), invoice({ id: 'invoice-2', status: 'CANCELLED' })],
      TODAY,
      10,
    );

    assert.equal(points.at(-1)?.balance, 1_000_000);
  });
});

describe('recurrencias e impuestos', () => {
  it('expande recurrencias dentro del horizonte sin persistir movimientos', () => {
    const source = recurring({ frequency: 'WEEKLY', next_date: '2026-08-06' });
    const events = phantomEvents([source], TODAY, 15);

    assert.deepEqual(events.map((event) => event.idx), [0, 7, 14]);
    assert.equal(source.next_date, '2026-08-06');
  });

  it('reserva impuestos solo sobre ingresos proyectados', () => {
    const amount = restrictedTax(
      [invoice({ total_amount: 100_000 }), invoice({ id: 'invoice-2', type: 'AP', total_amount: 500_000 })],
      [recurring({ type: 'IN', amount: 50_000 })],
      TODAY,
      10,
      20,
    );

    assert.equal(amount, 30_000);
  });

  it('limita la tasa de impuesto al rango 0–100', () => {
    const points = buildDailyProjection(0, [invoice()], TODAY, 10, [], 150);
    assert.equal(points.at(-1)?.balance, 0);
  });

  it('normaliza las frecuencias a equivalente mensual', () => {
    assert.equal(monthlyEquivalent(recurring({ frequency: 'MONTHLY', amount: 120_000 })), 120_000);
    assert.equal(monthlyEquivalent(recurring({ frequency: 'QUARTERLY', amount: 120_000 })), 40_000);
    assert.equal(monthlyEquivalent(recurring({ frequency: 'YEARLY', amount: 120_000 })), 10_000);
  });
});

describe('KPIs y agregación', () => {
  it('calcula burn y runway con historial trailing de 90 días', () => {
    const projection = buildDailyProjection(900_000, [], TODAY, 30);
    const kpis = computeKpis(
      900_000,
      [transaction({ amount: 300_000 }), transaction({ id: 'old', amount: 999_999, transaction_date: '2026-01-01' })],
      projection,
      TODAY,
    );

    assert.equal(kpis.monthlyBurn, 100_000);
    assert.equal(kpis.runwayMonths, 9);
  });

  it('usa el saldo de cierre de cada semana', () => {
    const points = buildDailyProjection(100, [], TODAY, 14);
    const weekly = aggregate(points, 'week');

    assert.deepEqual(weekly.map((point) => point.date), ['2026-08-12', '2026-08-19', '2026-08-20']);
  });
});
