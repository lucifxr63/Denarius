import type { FinancialToolRequest } from './financial-tools';

export type OrchestratorDecision =
  | { kind: 'tool'; request: FinancialToolRequest; reason: string }
  | { kind: 'clarification'; message: string }
  | { kind: 'denied'; code: 'cross_tenant' | 'write_not_allowed' | 'privilege_escalation'; message: string };

export interface OrchestratorContext {
  horizonDays?: 30 | 90 | 365;
  invoiceId?: string;
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function routeFinancialQuestion(question: string, context: OrchestratorContext = {}): OrchestratorDecision {
  const text = normalize(question);
  const explicitHorizon = text.match(/\b(30|90|365)\s*dias?\b/);
  const horizon = explicitHorizon ? Number(explicitHorizon[1]) as 30 | 90 | 365 : context.horizonDays ?? 90;

  if (/service[ -]?role|ignora (las )?reglas|omite (las )?reglas|eleva (mis )?permisos/.test(text)) {
    return { kind: 'denied', code: 'privilege_escalation', message: 'No puedo omitir controles ni elevar privilegios.' };
  }
  if (/otra empresa|otro tenant|tenant ajeno|datos ajenos/.test(text)) {
    return { kind: 'denied', code: 'cross_tenant', message: 'Solo puedo consultar la empresa activa de tu sesion.' };
  }
  if (/atras|tarde|demora|simula|escenario/.test(text)) {
    if (!context.invoiceId) {
      return { kind: 'clarification', message: 'Selecciona una factura por cobrar para simular su atraso sin guardar cambios.' };
    }
    const explicitDelay = text.match(/(\d{1,2})\s*dias?/);
    const delayDays = explicitDelay ? Number(explicitDelay[1]) : 20;
    if (delayDays < 1 || delayDays > 90) {
      return { kind: 'clarification', message: 'El atraso debe estar entre 1 y 90 dias.' };
    }
    return {
      kind: 'tool', reason: 'Simulacion no persistente de atraso de una cuenta por cobrar.',
      request: { name: 'simulate_scenario', arguments: { horizon_days: horizon, invoice_id: context.invoiceId, delay_days: delayDays } },
    };
  }
  if (/registra|crea|modifica|elimina|borra|paga|transfiere|actualiza/.test(text)) {
    return { kind: 'denied', code: 'write_not_allowed', message: 'Este copiloto es de solo lectura y no modifica informacion.' };
  }
  if (/pagos?.*(punto|saldo).*bajo|explica.*(proyeccion|punto|saldo minimo)/.test(text)) {
    return { kind: 'tool', reason: 'Explicacion del punto minimo proyectado.', request: { name: 'explain_projection_point', arguments: { horizon_days: horizon } } };
  }
  if (/de donde sale|explica.*(metrica|numero)|formula/.test(text)) {
    const metric = [
      ['restricted_cash', /caja restringida|impuesto|iva|ppm/],
      ['current_cash', /caja actual|saldo actual/],
      ['working_capital', /capital de trabajo/],
      ['burn_rate', /burn/],
      ['runway', /runway/],
      ['mrr', /mrr|ingreso recurrente/],
    ].find(([, pattern]) => (pattern as RegExp).test(text))?.[0];
    if (metric) {
      return {
        kind: 'tool', reason: 'Explicacion trazable de una metrica financiera.',
        request: { name: 'explain_metric', arguments: { metric: metric as 'current_cash' | 'restricted_cash' | 'working_capital' | 'burn_rate' | 'runway' | 'mrr' } },
      };
    }
    return { kind: 'clarification', message: 'Indica que metrica quieres explicar: caja, caja restringida, capital de trabajo, burn, runway o MRR.' };
  }
  if (/facturas?.*(vencid|cobrar)|cobros?.*vencid/.test(text)) {
    return { kind: 'tool', reason: 'Listado de cuentas por cobrar vencidas.', request: { name: 'list_overdue_invoices' } };
  }
  if (/impuesto|iva|ppm|caja restringida|reservar/.test(text)) {
    return { kind: 'tool', reason: 'Consulta de caja restringida.', request: { name: 'get_restricted_cash' } };
  }
  if (/burn|runway|meses.*caja/.test(text)) {
    return { kind: 'tool', reason: 'Consulta de burn y runway.', request: { name: 'get_runway_and_burn' } };
  }
  if (/sin caja|proyeccion|proyecta|90 dias|30 dias|365 dias/.test(text)) {
    return { kind: 'tool', reason: 'Consulta de proyeccion de caja.', request: { name: 'get_cash_projection', arguments: { horizon_days: horizon } } };
  }
  if (/resum|esta semana|situacion financiera|panorama/.test(text)) {
    return { kind: 'tool', reason: 'Resumen financiero ejecutivo.', request: { name: 'get_financial_summary' } };
  }
  if (/caja|disponible|saldo actual/.test(text)) {
    return { kind: 'tool', reason: 'Consulta de posicion de caja.', request: { name: 'get_cash_position' } };
  }
  return { kind: 'clarification', message: 'Puedo ayudarte con caja, runway, proyecciones, facturas vencidas, impuestos y escenarios de atraso.' };
}
