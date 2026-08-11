export const FINANCIAL_TOOLS_VERSION = '2026-08-06';

export type CurrencyCode = 'CLP' | 'USD' | 'EUR' | string;
export type Confidence = 'high' | 'medium' | 'low';

export interface ToolContext {
  /** Resuelto desde la sesión por el servidor; nunca desde texto del usuario. */
  tenantId: string;
  userId: string;
  asOf: string;
  currency: CurrencyCode;
}

export interface EvidenceSource {
  kind: 'table' | 'rpc' | 'calculation';
  name: string;
  asOf: string;
}

export interface EvidenceItem { label: string; value: string | number; as_of: string }

export interface ToolEnvelope<T> {
  version: typeof FINANCIAL_TOOLS_VERSION;
  tool: FinancialToolName;
  tenant_id: string;
  as_of: string;
  currency: CurrencyCode;
  confidence: Confidence;
  sources: EvidenceSource[];
  navigation: { path: string; label: string };
  evidence: EvidenceItem[];
  data: T;
}

export interface CashPosition {
  current_cash: number;
  restricted_cash: number;
  available_cash: number;
}

export interface RunwayAndBurn {
  monthly_burn: number;
  runway_months: number | null;
  period_start: string;
  period_end: string;
}

export interface OverdueInvoice {
  id: string;
  contact_name: string | null;
  due_date: string;
  total_amount: number;
  days_overdue: number;
}

export interface CashProjectionSummary {
  horizon_days: number;
  lowest_balance: number;
  lowest_date: string | null;
  ending_balance: number;
}

export interface FinancialToolProvider {
  getCashPosition(context: ToolContext): Promise<CashPosition>;
  getRunwayAndBurn(context: ToolContext): Promise<RunwayAndBurn>;
  listOverdueInvoices(context: ToolContext): Promise<OverdueInvoice[]>;
  getCashProjection(context: ToolContext, horizonDays: number): Promise<CashProjectionSummary>;
  getRestrictedCash(context: ToolContext): Promise<unknown>;
  explainMetric(context: ToolContext, metric: string): Promise<unknown>;
  getFinancialSummary(context: ToolContext): Promise<unknown>;
  explainProjectionPoint(context: ToolContext, horizonDays: number): Promise<unknown>;
  simulateScenario(context: ToolContext, invoiceId: string, delayDays: number, horizonDays: number): Promise<unknown>;
}

export const FINANCIAL_TOOL_CATALOG = {
  get_cash_position: {
    description: 'Caja actual, restringida y disponible a la fecha de corte.',
    readOnly: true,
  },
  get_runway_and_burn: {
    description: 'Burn mensual y runway con período explícito.',
    readOnly: true,
  },
  list_overdue_invoices: {
    description: 'Facturas por cobrar vencidas del tenant activo.',
    readOnly: true,
  },
  get_cash_projection: {
    description: 'Resumen de proyección para un horizonte permitido.',
    readOnly: true,
  },
  get_restricted_cash: {
    description: 'Caja reservada para IVA y PPM a la fecha de corte.',
    readOnly: true,
  },
  explain_metric: {
    description: 'Valor, glosa y fuente de una métrica financiera permitida.',
    readOnly: true,
  },
  get_financial_summary: {
    description: 'Resumen ejecutivo de caja, riesgo, runway y vencimientos.',
    readOnly: true,
  },
  explain_projection_point: {
    description: 'Explica los eventos que generan el saldo minimo proyectado.',
    readOnly: true,
  },
  simulate_scenario: {
    description: 'Simula el atraso de una cuenta por cobrar sin persistir cambios.',
    readOnly: true,
  },
} as const;

export type FinancialToolName = keyof typeof FINANCIAL_TOOL_CATALOG;

export const TOOL_NAVIGATION: Record<FinancialToolName,{path:string;label:string}> = {
  get_cash_position:{path:'/operations#financial-kpis',label:'Ver caja'},get_runway_and_burn:{path:'/operations#financial-kpis',label:'Ver indicadores'},list_overdue_invoices:{path:'/operations#overdue-invoices',label:'Ver facturas vencidas'},get_cash_projection:{path:'/operations#cash-projection',label:'Ver proyección'},get_restricted_cash:{path:'/operations#financial-kpis',label:'Ver caja restringida'},explain_metric:{path:'/dashboard',label:'Abrir dashboard'},get_financial_summary:{path:'/dashboard',label:'Abrir dashboard'},explain_projection_point:{path:'/operations#cash-projection',label:'Ver punto proyectado'},simulate_scenario:{path:'/operations#cash-projection',label:'Comparar escenario'},
};

export function buildEvidence(tool:FinancialToolName,data:unknown,asOf:string):EvidenceItem[]{
  if(Array.isArray(data))return [{label:'Registros encontrados',value:data.length,as_of:asOf}];
  const record=(data??{}) as Record<string,unknown>;const keys:Partial<Record<FinancialToolName,string[]>>={get_cash_position:['current_cash','restricted_cash','available_cash'],get_runway_and_burn:['monthly_burn','runway_months'],get_cash_projection:['lowest_balance','lowest_date','ending_balance'],get_financial_summary:['current_cash','working_capital','runway_months'],get_restricted_cash:['restricted_cash']};
  return (keys[tool]??[]).flatMap(key=>typeof record[key]==='number'||typeof record[key]==='string'?[{label:key,value:record[key] as string|number,as_of:asOf}]:[]).slice(0,4);
}

export type FinancialToolRequest =
  | { name: 'get_cash_position'; arguments?: Record<string, never> }
  | { name: 'get_runway_and_burn'; arguments?: Record<string, never> }
  | { name: 'list_overdue_invoices'; arguments?: Record<string, never> }
  | { name: 'get_cash_projection'; arguments: { horizon_days: 30 | 90 | 365 } }
  | { name: 'get_restricted_cash'; arguments?: Record<string, never> }
  | { name: 'explain_metric'; arguments: { metric: 'current_cash' | 'restricted_cash' | 'working_capital' | 'burn_rate' | 'runway' | 'mrr' } }
  | { name: 'get_financial_summary'; arguments?: Record<string, never> }
  | { name: 'explain_projection_point'; arguments: { horizon_days: 30 | 90 | 365 } }
  | { name: 'simulate_scenario'; arguments: { horizon_days: 30 | 90 | 365; invoice_id: string; delay_days: number } };

function sources(context: ToolContext, ...names: Array<[EvidenceSource['kind'], string]>): EvidenceSource[] {
  return names.map(([kind, name]) => ({ kind, name, asOf: context.asOf }));
}

function envelope<T>(
  request: FinancialToolRequest,
  context: ToolContext,
  data: T,
  evidence: EvidenceSource[],
): ToolEnvelope<T> {
  return {
    version: FINANCIAL_TOOLS_VERSION,
    tool: request.name,
    tenant_id: context.tenantId,
    as_of: context.asOf,
    currency: context.currency,
    confidence: 'high',
    sources: evidence,
    navigation: TOOL_NAVIGATION[request.name],
    evidence: buildEvidence(request.name,data,context.asOf),
    data,
  };
}

export async function executeFinancialTool(
  request: FinancialToolRequest,
  context: ToolContext,
  provider: FinancialToolProvider,
): Promise<ToolEnvelope<unknown>> {
  if (!context.tenantId || !context.userId) throw new Error('Contexto autenticado incompleto');

  switch (request.name) {
    case 'get_cash_position':
      return envelope(request, context, await provider.getCashPosition(context), sources(context,
        ['table', 'bank_account'], ['rpc', 'metrics_pyme']));
    case 'get_runway_and_burn':
      return envelope(request, context, await provider.getRunwayAndBurn(context), sources(context,
        ['rpc', 'metrics_saas'], ['calculation', 'runway_and_burn']));
    case 'list_overdue_invoices':
      return envelope(request, context, await provider.listOverdueInvoices(context), sources(context,
        ['table', 'invoice']));
    case 'get_cash_projection': {
      const horizon = request.arguments?.horizon_days;
      if (![30, 90, 365].includes(horizon)) throw new Error('horizon_days debe ser 30, 90 o 365');
      return envelope(request, context, await provider.getCashProjection(context, horizon), sources(context,
        ['table', 'bank_account'], ['table', 'invoice'], ['table', 'recurring_transaction'],
        ['calculation', 'cash_projection']));
    }
    case 'get_restricted_cash':
      return envelope(request, context, await provider.getRestrictedCash(context), sources(context,
        ['rpc', 'metrics_pyme']));
    case 'explain_metric':
      return envelope(request, context, await provider.explainMetric(context, request.arguments.metric), sources(context,
        ['rpc', 'metrics_pyme'], ['rpc', 'metrics_saas']));
    case 'get_financial_summary':
      return envelope(request, context, await provider.getFinancialSummary(context), sources(context,
        ['rpc', 'metrics_pyme'], ['rpc', 'metrics_saas'], ['table', 'invoice']));
    case 'explain_projection_point':
      return envelope(request, context, await provider.explainProjectionPoint(context, request.arguments.horizon_days), sources(context,
        ['table', 'bank_account'], ['table', 'invoice'], ['table', 'recurring_transaction'],
        ['calculation', 'projection_point_explanation']));
    case 'simulate_scenario':
      return envelope(request, context, await provider.simulateScenario(
        context, request.arguments.invoice_id, request.arguments.delay_days, request.arguments.horizon_days,
      ), sources(context,
        ['table', 'bank_account'], ['table', 'invoice'], ['table', 'recurring_transaction'],
        ['calculation', 'non_persistent_scenario']));
  }
}
