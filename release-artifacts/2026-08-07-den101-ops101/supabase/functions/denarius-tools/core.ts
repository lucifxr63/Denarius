export const TOOL_VERSION = '2026-08-06';
export const ALLOWED_HORIZONS = [30, 90, 365] as const;

export type ToolName =
  | 'get_cash_position'
  | 'get_runway_and_burn'
  | 'list_overdue_invoices'
  | 'get_cash_projection'
  | 'get_restricted_cash'
  | 'explain_metric'
  | 'get_financial_summary'
  | 'explain_projection_point'
  | 'simulate_scenario';

export const EXPLAINABLE_METRICS = [
  'current_cash', 'restricted_cash', 'working_capital', 'burn_rate', 'runway', 'mrr',
] as const;

export interface ToolRequest {
  name: ToolName;
  arguments?: { horizon_days?: number; metric?: string; invoice_id?: string; delay_days?: number };
}

export const TOOL_JSON_SCHEMAS = {
  get_cash_position: { type: 'object', additionalProperties: false, properties: {} },
  get_runway_and_burn: { type: 'object', additionalProperties: false, properties: {} },
  list_overdue_invoices: { type: 'object', additionalProperties: false, properties: {} },
  get_cash_projection: {
    type: 'object', additionalProperties: false, required: ['horizon_days'],
    properties: { horizon_days: { type: 'integer', enum: [...ALLOWED_HORIZONS] } },
  },
  get_restricted_cash: { type: 'object', additionalProperties: false, properties: {} },
  explain_metric: {
    type: 'object', additionalProperties: false, required: ['metric'],
    properties: { metric: { type: 'string', enum: [...EXPLAINABLE_METRICS] } },
  },
  get_financial_summary: { type: 'object', additionalProperties: false, properties: {} },
  explain_projection_point: {
    type: 'object', additionalProperties: false, required: ['horizon_days'],
    properties: { horizon_days: { type: 'integer', enum: [...ALLOWED_HORIZONS] } },
  },
  simulate_scenario: {
    type: 'object', additionalProperties: false, required: ['horizon_days', 'invoice_id', 'delay_days'],
    properties: {
      horizon_days: { type: 'integer', enum: [...ALLOWED_HORIZONS] },
      invoice_id: { type: 'string', format: 'uuid' },
      delay_days: { type: 'integer', minimum: 1, maximum: 90 },
    },
  },
} as const;

export interface ProjectionInvoice {
  type: 'AR' | 'AP';
  status: string;
  total_amount: number;
  due_date: string;
}

export interface ProjectionRecurring {
  type: 'IN' | 'OUT';
  amount: number;
  frequency: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  next_date: string;
}

export interface BurnTransaction { type: 'IN' | 'OUT'; amount: number; transaction_date: string }

export function runwayAndBurn(
  currentCash: number,
  transactions: BurnTransaction[],
  recurring: ProjectionRecurring[],
  asOf: string,
  taxRate = 0,
) {
  const end = utcDate(asOf);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 90);
  const incomeFactor = 1 - Math.max(0, Math.min(100, taxRate)) / 100;
  let incoming = 0;
  let outgoing = 0;
  for (const transaction of transactions) {
    const date = utcDate(transaction.transaction_date);
    if (date < start || date > end) continue;
    if (transaction.type === 'IN') incoming += Number(transaction.amount);
    else outgoing += Number(transaction.amount);
  }
  const factor = { WEEKLY: 52 / 12, MONTHLY: 1, QUARTERLY: 1 / 3, YEARLY: 1 / 12 } as const;
  const recurringNet = recurring.reduce((sum, item) => {
    const monthly = Number(item.amount) * factor[item.frequency];
    return sum + (item.type === 'IN' ? monthly * incomeFactor : -monthly);
  }, 0);
  const monthlyNet = (incoming * incomeFactor - outgoing) / 3 + recurringNet;
  const monthlyBurn = monthlyNet < 0 ? -monthlyNet : 0;
  return {
    monthly_burn: monthlyBurn,
    runway_months: monthlyBurn > 0 ? currentCash / monthlyBurn : null,
    period_start: isoDate(start),
    period_end: asOf,
  };
}

export function parseToolRequest(value: unknown): ToolRequest {
  if (!value || typeof value !== 'object') throw new Error('Body JSON requerido');
  const input = value as { name?: unknown; arguments?: unknown; tenant_id?: unknown };
  if ('tenant_id' in input) throw new Error('tenant_id no está permitido en argumentos');

  const names: ToolName[] = [
    'get_cash_position',
    'get_runway_and_burn',
    'list_overdue_invoices',
    'get_cash_projection',
    'get_restricted_cash',
    'explain_metric',
    'get_financial_summary',
    'explain_projection_point',
    'simulate_scenario',
  ];
  if (typeof input.name !== 'string' || !names.includes(input.name as ToolName)) {
    throw new Error('Herramienta desconocida');
  }

  if (input.name === 'get_cash_projection' || input.name === 'explain_projection_point') {
    const horizon = (input.arguments as { horizon_days?: unknown } | undefined)?.horizon_days;
    if (typeof horizon !== 'number' || !ALLOWED_HORIZONS.includes(horizon as 30 | 90 | 365)) {
      throw new Error('horizon_days debe ser 30, 90 o 365');
    }
    return { name: input.name, arguments: { horizon_days: horizon } };
  }

  if (input.name === 'simulate_scenario') {
    const args = input.arguments as { horizon_days?: unknown; invoice_id?: unknown; delay_days?: unknown } | undefined;
    if (typeof args?.horizon_days !== 'number' || !ALLOWED_HORIZONS.includes(args.horizon_days as 30 | 90 | 365)) {
      throw new Error('horizon_days debe ser 30, 90 o 365');
    }
    if (typeof args.invoice_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(args.invoice_id)) {
      throw new Error('invoice_id debe ser UUID');
    }
    if (!Number.isInteger(args.delay_days) || Number(args.delay_days) < 1 || Number(args.delay_days) > 90) {
      throw new Error('delay_days debe ser un entero entre 1 y 90');
    }
    return { name: input.name, arguments: { horizon_days: args.horizon_days, invoice_id: args.invoice_id, delay_days: args.delay_days as number } };
  }

  if (input.name === 'explain_metric') {
    const metric = (input.arguments as { metric?: unknown } | undefined)?.metric;
    if (typeof metric !== 'string' || !EXPLAINABLE_METRICS.includes(metric as typeof EXPLAINABLE_METRICS[number])) {
      throw new Error('metric no está permitido');
    }
    return { name: input.name, arguments: { metric } };
  }

  if (input.arguments && Object.keys(input.arguments as object).length > 0) {
    throw new Error('La herramienta no acepta argumentos');
  }
  return { name: input.name as ToolName };
}

function utcDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addFrequency(date: Date, frequency: ProjectionRecurring['frequency']): Date {
  const next = new Date(date);
  if (frequency === 'WEEKLY') next.setUTCDate(next.getUTCDate() + 7);
  else if (frequency === 'MONTHLY') next.setUTCMonth(next.getUTCMonth() + 1);
  else if (frequency === 'QUARTERLY') next.setUTCMonth(next.getUTCMonth() + 3);
  else next.setUTCFullYear(next.getUTCFullYear() + 1);
  return next;
}

export function projectionSummary(
  currentCash: number,
  invoices: ProjectionInvoice[],
  recurring: ProjectionRecurring[],
  asOf: string,
  horizonDays: number,
  taxRate = 0,
) {
  return projectionAnalysis(currentCash, invoices, recurring, asOf, horizonDays, taxRate).summary;
}

export function projectionAnalysis(
  currentCash: number,
  invoices: ProjectionInvoice[],
  recurring: ProjectionRecurring[],
  asOf: string,
  horizonDays: number,
  taxRate = 0,
) {
  const start = utcDate(asOf);
  const deltas = new Array<number>(horizonDays + 1).fill(0);
  const events: Array<{ date: string; kind: 'invoice' | 'recurring'; direction: 'in' | 'out'; amount: number }> = [];
  const incomeFactor = 1 - Math.max(0, Math.min(100, taxRate)) / 100;
  const indexOf = (date: Date) => Math.round((date.getTime() - start.getTime()) / 86_400_000);

  for (const invoice of invoices) {
    if (invoice.status !== 'PENDING') continue;
    const index = indexOf(utcDate(invoice.due_date));
    const amount = Number(invoice.total_amount);
    if (invoice.type === 'AP') {
      if (index < 0) {
        deltas[0] -= amount;
        events.push({ date: asOf, kind: 'invoice', direction: 'out', amount });
      } else if (index <= horizonDays) {
        deltas[index] -= amount;
        events.push({ date: invoice.due_date, kind: 'invoice', direction: 'out', amount });
      }
    } else if (index >= 0 && index <= horizonDays) {
      const netAmount = amount * incomeFactor;
      deltas[index] += netAmount;
      events.push({ date: invoice.due_date, kind: 'invoice', direction: 'in', amount: netAmount });
    }
  }

  for (const rule of recurring) {
    let date = utcDate(rule.next_date);
    let guard = 0;
    while (date < start && guard++ < 1_000) date = addFrequency(date, rule.frequency);
    while (indexOf(date) <= horizonDays) {
      const index = indexOf(date);
      if (index >= 0) {
        const amount = rule.type === 'IN' ? Number(rule.amount) * incomeFactor : Number(rule.amount);
        deltas[index] += rule.type === 'IN' ? amount : -amount;
        events.push({ date: isoDate(date), kind: 'recurring', direction: rule.type === 'IN' ? 'in' : 'out', amount });
      }
      date = addFrequency(date, rule.frequency);
    }
  }

  let balance = currentCash;
  let lowestBalance = currentCash;
  let lowestDate: string | null = null;
  for (let index = 0; index <= horizonDays; index++) {
    balance += deltas[index];
    if (balance < lowestBalance) {
      lowestBalance = balance;
      const date = new Date(start);
      date.setUTCDate(date.getUTCDate() + index);
      lowestDate = isoDate(date);
    }
  }

  const summary = {
    horizon_days: horizonDays, lowest_balance: Math.round(lowestBalance),
    lowest_date: lowestDate, ending_balance: Math.round(balance),
  };
  return {
    summary,
    lowest_point_events: lowestDate
      ? events.filter((event) => event.date === lowestDate).sort((a, b) => b.amount - a.amount)
      : [],
  };
}
