import { describe, it, expect } from 'vitest';
import { buildDailyProjection, minBalanceUntil, type SimulatedBid } from './projection';
import type { Invoice, RecurringTransaction } from './queries';

// Fecha base fija para determinismo. `iso(n)` = hoy + n días.
const TODAY = new Date('2026-07-22T00:00:00');
function iso(offsetDays: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// Factories mínimas: buildDailyProjection solo lee estos campos.
function inv(type: 'AR' | 'AP', total_amount: number, due_date: string, status = 'PENDING'): Invoice {
  return { type, total_amount, due_date, status } as unknown as Invoice;
}
function rec(type: 'IN' | 'OUT', amount: number, next_date: string, frequency = 'MONTHLY'): RecurringTransaction {
  return { type, amount, next_date, frequency } as unknown as RecurringTransaction;
}

describe('buildDailyProjection — comportamiento base', () => {
  it('sin eventos, la caja se mantiene plana', () => {
    const p = buildDailyProjection(100_000, [], TODAY, 30);
    expect(p[0].balance).toBe(100_000);
    expect(p[30].balance).toBe(100_000);
    expect(p).toHaveLength(31); // hoy..hoy+30 inclusive
  });

  it('A/R futura suma en su vencimiento', () => {
    const p = buildDailyProjection(0, [inv('AR', 500_000, iso(10))], TODAY, 30);
    expect(p[9].balance).toBe(0);
    expect(p[10].balance).toBe(500_000);
  });

  it('A/P futura resta en su vencimiento', () => {
    const p = buildDailyProjection(500_000, [inv('AP', 200_000, iso(5))], TODAY, 30);
    expect(p[4].balance).toBe(500_000);
    expect(p[5].balance).toBe(300_000);
  });

  it('A/P vencida se mueve a HOY (peor escenario)', () => {
    const p = buildDailyProjection(500_000, [inv('AP', 200_000, iso(-3))], TODAY, 30);
    expect(p[0].balance).toBe(300_000);
  });

  it('A/R vencida NO se proyecta (va al Resolution Center)', () => {
    const p = buildDailyProjection(100_000, [inv('AR', 999_999, iso(-3))], TODAY, 30);
    expect(p[30].balance).toBe(100_000);
  });

  it('facturas no-PENDING se ignoran', () => {
    const p = buildDailyProjection(100_000, [inv('AR', 500_000, iso(10), 'PAID')], TODAY, 30);
    expect(p[30].balance).toBe(100_000);
  });

  it('recurrentes: IN suma y OUT resta (run/burn rate)', () => {
    const p = buildDailyProjection(100_000, [], TODAY, 40, [rec('IN', 50_000, iso(5)), rec('OUT', 30_000, iso(5))]);
    expect(p[5].balance).toBe(120_000); // +50k -30k
  });

  it('reserva de impuesto: A/R entra neto (1 - tax%)', () => {
    const p = buildDailyProjection(0, [inv('AR', 1_000_000, iso(10))], TODAY, 30, [], 19);
    expect(p[10].balance).toBe(810_000); // 1M * (1 - 0.19)
  });
});

describe('buildDailyProjection — licitaciones simuladas (Fase 3)', () => {
  const bid = (over: Partial<SimulatedBid> = {}): SimulatedBid => ({
    id: 'b1', amount: 1_000_000, payDate: iso(10), probability: 70, ...over,
  });

  it('inyecta ingreso ponderado por probabilidad en la fecha de pago', () => {
    const p = buildDailyProjection(100_000, [], TODAY, 30, [], 0, [bid()]);
    expect(p[9].balance).toBe(100_000); // aún base
    expect(p[10].balance).toBe(800_000); // +1M * 0.70
    expect(p[30].balance).toBe(800_000); // se mantiene
  });

  it('aplica la reserva de impuesto igual que un A/R', () => {
    const p = buildDailyProjection(100_000, [], TODAY, 30, [], 19, [bid()]);
    expect(p[10].balance).toBe(100_000 + Math.round(1_000_000 * 0.7 * 0.81));
  });

  it('probabilidad 0% no aporta nada', () => {
    const p = buildDailyProjection(100_000, [], TODAY, 30, [], 0, [bid({ probability: 0 })]);
    expect(p[30].balance).toBe(100_000);
  });

  it('probabilidad 100% aporta el monto completo', () => {
    const p = buildDailyProjection(100_000, [], TODAY, 30, [], 0, [bid({ probability: 100 })]);
    expect(p[10].balance).toBe(1_100_000);
  });

  it('bid fuera del horizonte no afecta', () => {
    const p = buildDailyProjection(100_000, [], TODAY, 30, [], 0, [bid({ payDate: iso(999) })]);
    expect(p[30].balance).toBe(100_000);
  });

  it('bid con fecha de pago pasada no afecta', () => {
    const p = buildDailyProjection(100_000, [], TODAY, 30, [], 0, [bid({ payDate: iso(-5) })]);
    expect(p[30].balance).toBe(100_000);
  });

  it('múltiples bids se acumulan', () => {
    const p = buildDailyProjection(0, [], TODAY, 30, [], 0, [
      bid({ id: 'a', amount: 1_000_000, probability: 50, payDate: iso(10) }),
      bid({ id: 'b', amount: 2_000_000, probability: 50, payDate: iso(20) }),
    ]);
    expect(p[10].balance).toBe(500_000);
    expect(p[20].balance).toBe(1_500_000); // 500k + 1M
  });

  it('probabilidad fuera de rango se acota a [0,100]', () => {
    const p = buildDailyProjection(0, [], TODAY, 30, [], 0, [bid({ amount: 1_000_000, probability: 150 })]);
    expect(p[10].balance).toBe(1_000_000); // acotado a 100%
  });
});

describe('minBalanceUntil — alerta de capital de trabajo (§3.2)', () => {
  it('detecta el valle antes de la fecha de pago', () => {
    const base = buildDailyProjection(100_000, [inv('AP', 300_000, iso(5))], TODAY, 30);
    const valley = minBalanceUntil(base, iso(10));
    expect(valley?.balance).toBe(-200_000);
    expect(valley?.date).toBe(iso(5));
  });

  it('no considera puntos posteriores a la fecha límite', () => {
    // Caída fuerte en día 20, pero el límite es día 10 → no la ve.
    const base = buildDailyProjection(100_000, [inv('AP', 900_000, iso(20))], TODAY, 30);
    const valley = minBalanceUntil(base, iso(10));
    expect(valley?.balance).toBe(100_000); // el mínimo hasta día 10 es la caja plana
  });

  it('serie vacía devuelve null', () => {
    expect(minBalanceUntil([], iso(10))).toBeNull();
  });
});
