import type { ToolEnvelope } from './financial-tools';

function clp(value: unknown) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
    .format(Number(value ?? 0));
}

function months(value: unknown) {
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(Number(value));
}

export function formatToolResult(envelope: ToolEnvelope<unknown>): string {
  const data = envelope.data as Record<string, unknown>;
  switch (envelope.tool) {
    case 'get_cash_position':
      return `Tu caja disponible es ${clp(data.available_cash)}. Caja total: ${clp(data.current_cash)}; restringida: ${clp(data.restricted_cash)}.`;
    case 'get_restricted_cash':
      return `Debes mantener ${clp(data.restricted_cash)} como caja restringida. ${String(data.note ?? '')}`.trim();
    case 'get_runway_and_burn':
      return `Tu burn mensual es ${clp(data.monthly_burn)} y tu runway es ${data.runway_months == null ? 'sin límite calculable' : `${months(data.runway_months)} meses`}.`;
    case 'get_cash_projection':
      return `En ${data.horizon_days} días, el saldo mínimo proyectado es ${clp(data.lowest_balance)}${data.lowest_date ? ` el ${data.lowest_date}` : ''}. El saldo final sería ${clp(data.ending_balance)}.`;
    case 'list_overdue_invoices': {
      const invoices = envelope.data as Array<Record<string, unknown>>;
      if (!invoices.length) return 'No tienes facturas por cobrar vencidas a la fecha de corte.';
      const total = invoices.reduce((sum, invoice) => sum + Number(invoice.total_amount ?? 0), 0);
      return `Tienes ${invoices.length} factura${invoices.length === 1 ? '' : 's'} vencida${invoices.length === 1 ? '' : 's'} por ${clp(total)} en total.`;
    }
    case 'get_financial_summary':
      return `Caja actual: ${clp(data.current_cash)}. Caja restringida: ${clp(data.restricted_cash)}. Capital de trabajo: ${clp(data.working_capital)}. Runway: ${data.runway_months == null ? 'sin límite calculable' : `${months(data.runway_months)} meses`}.`;
    case 'explain_metric':
      return `${String(data.metric ?? 'Métrica')}: ${String(data.display ?? data.value ?? 'sin valor')}. ${String(data.formula ?? '')}`.trim();
    case 'explain_projection_point': {
      const summary = data.summary as Record<string, unknown>;
      const events = data.lowest_point_events as Array<Record<string, unknown>>;
      return `El punto más bajo es ${clp(summary.lowest_balance)}${summary.lowest_date ? ` el ${summary.lowest_date}` : ''}. ${events.length ? `${events.length} evento${events.length === 1 ? '' : 's'} ocurre${events.length === 1 ? '' : 'n'} ese día.` : 'No hay un evento único asociado a ese mínimo.'}`;
    }
    case 'simulate_scenario': {
      const result = data.result as Record<string, unknown>;
      return `Simulación no guardada: el saldo mínimo sería ${clp(result.lowest_balance)} y el saldo final ${clp(result.ending_balance)}.`;
    }
  }
}
