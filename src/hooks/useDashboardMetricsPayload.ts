import { useEffect, useState } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getDefaultTenant } from '@/lib/queries';
import { reportError } from '@/lib/report-error';
import { useWorkspaceStore, type WorkspaceModel } from '@/store/useWorkspaceStore';
import type { SaasRetentionMetrics } from '@/lib/saas-retention';
import type { SaasRiskReport } from '@/lib/saas-risk';
import type { RenewalWorkspace } from '@/lib/saas-renewals';

// Hook orquestador central. Único punto que "hace fetch": escucha el modelo
// activo en useWorkspaceStore y obtiene el payload de métricas vía RPC. Los
// widgets son stateless y reciben su porción ya resuelta desde el DashboardCanvas.
//
// Fuente de verdad: cashflow.metrics_pyme / cashflow.metrics_saas (migración
// 20260624000000). Mientras la migración no esté desplegada, se aplica
// DEGRADACIÓN ELEGANTE al mock — pero SOLO ante "RPC/columna no desplegada".
// Cualquier otro fallo (RLS, permisos, timeout) falla ruidosamente.

export type MetricTone = 'positive' | 'negative' | 'warning' | 'neutral';

export interface WidgetMetric {
  /** Valor formateado y listo para render (ej. "$4,8M", "8,2 meses"). */
  display: string;
  /** Valor numérico crudo (lo añade la RPC; el mock no lo trae). */
  value?: number | null;
  /** Variación relativa vs. período previo, en fracción (0.12 = +12%). */
  delta?: number;
  /** Serie corta para sparkline/placeholder de gráfico. */
  trend?: number[];
  /** Semántica de color para el widget. */
  tone?: MetricTone;
  /** Glosa contextual bajo el valor. */
  note?: string;
}

/** Diccionario widgetId → métrica. Lo consume el DashboardCanvas. */
export type MetricsPayload = Record<string, WidgetMetric>;

export interface DashboardMetricsResult {
  model: WorkspaceModel;
  data: MetricsPayload | null;
  loading: boolean;
  error: string | null;
  /** true = los datos provienen del mock (RPC aún no desplegada). */
  degraded: boolean;
}

// ── Contrato de la RPC (DEUDA TÉCNICA contenida) ────────────────────────────
// database.types.ts aún no conoce estas funciones ni la columna business_model.
// Tipamos el contrato localmente y hacemos UNA aserción acotada sobre
// supabase.rpc. Resolver con `npm run gen:types` tras desplegar la migración.
type MetricsRpcName = 'metrics_pyme' | 'metrics_saas';

const RPC_BY_MODEL: Record<WorkspaceModel, MetricsRpcName> = {
  'pyme-tradicional': 'metrics_pyme',
  'startup-saas': 'metrics_saas',
};

async function callMetricsRpc(
  fn: MetricsRpcName,
  tenantId: string,
  signal: AbortSignal,
): Promise<{ data: MetricsPayload | null; error: PostgrestError | null }> {
  // Aserción contenida: el cliente tipado todavía no expone estas RPCs. Se invoca
  // como MÉTODO sobre el cliente para preservar `this` (supabase-js usa `this.rest`).
  const result = await supabase.rpc(fn, { p_tenant_id: tenantId }).abortSignal(signal);
  return { data: result.data as MetricsPayload | null, error: result.error };
}

interface SaasGrowthMetrics {
  subscription_count: number;
  active_customers: number;
  mrr: number;
  new_mrr: number;
  expansion_mrr: number;
  contraction_mrr: number;
  churned_mrr: number;
  net_new_mrr: number;
  revenue_churn_rate: number | null;
}

const compactClp = new Intl.NumberFormat('es-CL', {
  style: 'currency', currency: 'CLP', notation: 'compact', maximumFractionDigits: 1,
});

function withSaasGrowth(base: MetricsPayload, growth: SaasGrowthMetrics): MetricsPayload {
  const hasSubscriptions = growth.subscription_count > 0;
  return {
    ...base,
    ...(hasSubscriptions ? {
      mrrWidget: { display: compactClp.format(growth.mrr), value: growth.mrr, tone: 'positive', note: 'MRR contractual activo' },
      mrrGrowthWidget: { display: compactClp.format(growth.net_new_mrr), value: growth.net_new_mrr, tone: growth.net_new_mrr >= 0 ? 'positive' : 'negative', note: 'Nuevo + expansión − contracción − churn' },
    } : {}),
    newMrrWidget: { display: compactClp.format(growth.new_mrr), value: growth.new_mrr, tone: 'positive', note: 'Altas y reactivaciones del mes' },
    expansionMrrWidget: { display: compactClp.format(growth.expansion_mrr), value: growth.expansion_mrr, tone: 'positive', note: 'Expansión del mes' },
    churnedMrrWidget: { display: compactClp.format(growth.churned_mrr), value: growth.churned_mrr, tone: growth.churned_mrr > 0 ? 'negative' : 'neutral', note: 'MRR perdido en el mes' },
    churnRateWidget: { display: growth.revenue_churn_rate === null ? '—' : `${(growth.revenue_churn_rate * 100).toFixed(1).replace('.', ',')}%`, value: growth.revenue_churn_rate, tone: growth.revenue_churn_rate && growth.revenue_churn_rate > 0.05 ? 'negative' : 'neutral', note: 'Churn sobre MRR inicial' },
    activeCustomersWidget: { display: String(growth.active_customers), value: growth.active_customers, tone: 'neutral', note: `${growth.subscription_count} suscripciones activas` },
  };
}

function percentMetric(value: number | null | undefined, note: string, inverse = false): WidgetMetric {
  if (value === null || value === undefined) return { display: '—', tone: 'neutral', note: 'Sin base inicial para calcular' };
  const healthy = inverse ? value <= 0.05 : value >= 1;
  return { display: `${(value * 100).toFixed(1).replace('.', ',')}%`, value, tone: healthy ? 'positive' : value > 0 ? 'warning' : 'neutral', note };
}

function withSaasRetention(base: MetricsPayload, retention: SaasRetentionMetrics): MetricsPayload {
  const current = retention.current;
  const trend = retention.periods.map((period) => period.nrr === null ? 0 : Number((period.nrr * 100).toFixed(1)));
  return {
    ...base,
    nrrWidget: percentMetric(current.nrr, 'Expansión − contracción − churn sobre base inicial'),
    grrWidget: percentMetric(current.grr, 'Retención sin considerar expansiones'),
    logoChurnWidget: percentMetric(current.logo_churn, 'Clientes perdidos sobre clientes iniciales', true),
    retentionTrendWidget: { display: current.nrr == null ? 'Sin base' : `${(current.nrr * 100).toFixed(1).replace('.', ',')}%`, value: current.nrr, trend, tone: current.nrr != null && current.nrr >= 1 ? 'positive' : 'warning', note: 'NRR mensual · últimos 6 meses' },
  };
}

function withSaasRisk(base: MetricsPayload, risk: SaasRiskReport): MetricsPayload {
  return {...base,
    topConcentrationWidget:{display:`${(risk.top_customer_concentration*100).toFixed(1).replace('.',',')}%`,value:risk.top_customer_concentration,tone:risk.top_customer_concentration>=.4?'negative':risk.top_customer_concentration>=.2?'warning':'positive',note:'Participación del mayor cliente'},
    atRiskMrrWidget:{display:compactClp.format(risk.at_risk_mrr),value:risk.at_risk_mrr,tone:risk.at_risk_mrr>0?'warning':'positive',note:'MRR con alertas determinísticas'},
    atRiskCustomersWidget:{display:String(risk.at_risk_customers),value:risk.at_risk_customers,tone:risk.at_risk_customers>0?'warning':'positive',note:'Contracción o concentración'},
  };
}
function withRenewals(base:MetricsPayload,r:RenewalWorkspace):MetricsPayload{return{...base,overdueRenewalsWidget:{display:String(r.overdue),value:r.overdue,tone:r.overdue>0?'negative':'positive',note:'Requieren escalamiento'},upcomingRenewalsWidget:{display:String(r.due_30_days),value:r.due_30_days,tone:r.due_30_days>0?'warning':'neutral',note:'Vencen en los próximos 30 días'},renewalMrrWidget:{display:compactClp.format(r.mrr_due_30_days),value:r.mrr_due_30_days,tone:r.mrr_due_30_days>0?'warning':'neutral',note:'MRR contractual por gestionar'}};}

// Códigos que indican "RPC/columna aún no desplegada" → ÚNICO caso en que se
// permite degradar al mock. Cualquier otro error debe propagarse a la UI.
const NOT_DEPLOYED_CODES = new Set<string>([
  'PGRST202', // función no encontrada en el schema cache de PostgREST
  'PGRST204', // columna no encontrada (ej. business_model no reconocida aún)
  '42883', // undefined_function (Postgres)
  '42703', // undefined_column
  '42P01', // undefined_table
]);

function isNotDeployed(error: PostgrestError): boolean {
  return NOT_DEPLOYED_CODES.has(error.code);
}

// ── Mocks por modelo (fallback temporal; se elimina al desplegar la migración) ─
const MOCKS: Record<WorkspaceModel, MetricsPayload> = {
  'pyme-tradicional': {
    currentCashWidget: { display: '$12,4M', delta: 0.04, tone: 'positive', note: 'Disponible en cuentas' },
    restrictedCashWidget: { display: '$3,1M', tone: 'warning', note: 'IVA neto + PPM del período' },
    workingCapitalWidget: { display: '$8,9M', delta: -0.02, tone: 'neutral', note: 'Activo circulante − pasivo' },
    liquidityProjectionWidget: {
      display: 'Saldo mínimo $1,2M',
      tone: 'neutral',
      note: 'Próximos 90 días',
      trend: [12.4, 11.8, 10.2, 8.6, 6.1, 4.4, 2.8, 1.2, 2.0, 3.5],
    },
    receivablesWidget: { display: '$6,7M', tone: 'warning', note: '4 facturas vencidas' },
  },
  'startup-saas': {
    burnRateWidget: { display: '$9,8M/mes', delta: 0.08, tone: 'negative', note: 'Quema neta mensual' },
    grossBurnWidget: { display: '$13,9M/mes', tone: 'neutral', note: 'Salidas promedio + recurrencias' },
    runwayWidget: { display: '8,2 meses', tone: 'warning', note: 'A burn rate actual' },
    mrrWidget: { display: '$4,1M', delta: 0.12, tone: 'positive', note: 'Ingreso recurrente mensual' },
    mrrGrowthWidget: { display: '$440K', tone: 'positive', note: 'MRR actual − mes anterior' },
    burnMultipleWidget: { display: '1,4×', tone: 'warning', note: 'Burn neto ÷ crecimiento de MRR' },
    burnTrendWidget: {
      display: 'Quema 6M',
      tone: 'negative',
      note: 'Últimos 6 meses',
      trend: [7.2, 7.9, 8.4, 8.8, 9.3, 9.8],
    },
    cashBalanceWidget: { display: '$80,4M', delta: -0.11, tone: 'neutral', note: 'Caja en banco' },
    newMrrWidget: { display: '$0', tone: 'neutral', note: 'Sin suscripciones registradas' },
    expansionMrrWidget: { display: '$0', tone: 'neutral', note: 'Sin expansiones registradas' },
    churnedMrrWidget: { display: '$0', tone: 'neutral', note: 'Sin churn registrado' },
    churnRateWidget: { display: '—', tone: 'neutral', note: 'Sin base inicial' },
    activeCustomersWidget: { display: '0', tone: 'neutral', note: 'Sin suscripciones activas' },
    nrrWidget: { display: '—', tone: 'neutral', note: 'Sin base inicial para calcular' },
    grrWidget: { display: '—', tone: 'neutral', note: 'Sin base inicial para calcular' },
    logoChurnWidget: { display: '—', tone: 'neutral', note: 'Sin base inicial para calcular' },
    retentionTrendWidget: { display: 'Sin base', trend: [], tone: 'neutral', note: 'NRR mensual · últimos 6 meses' },
    topConcentrationWidget:{display:'0,0%',tone:'neutral',note:'Sin clientes activos'},
    atRiskMrrWidget:{display:'$0',tone:'neutral',note:'Sin alertas activas'},
    atRiskCustomersWidget:{display:'0',tone:'neutral',note:'Sin alertas activas'},
    overdueRenewalsWidget:{display:'0',tone:'neutral',note:'Sin vencimientos'},upcomingRenewalsWidget:{display:'0',tone:'neutral',note:'Sin renovaciones próximas'},renewalMrrWidget:{display:'$0',tone:'neutral',note:'Sin MRR por gestionar'},
  },
};

/** Mock asíncrono con latencia simulada. Solo se usa en degradación elegante. */
function fetchMockMetrics(model: WorkspaceModel, signal: AbortSignal): Promise<MetricsPayload> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => resolve(MOCKS[model]), 300);
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

export function useDashboardMetricsPayload(): DashboardMetricsResult {
  const model = useWorkspaceStore((s) => s.model);
  // undefined = resolviendo · null = sin empresa · string = tenant activo.
  const [tenantId, setTenantId] = useState<string | null | undefined>(undefined);
  const [data, setData] = useState<MetricsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [degraded, setDegraded] = useState(false);

  // Resuelve la empresa activa una vez (la RLS la acota al usuario).
  useEffect(() => {
    let ignore = false;
    getDefaultTenant()
      .then((t) => {
        if (!ignore) setTenantId(t?.id ?? null);
      })
      .catch((err: unknown) => {
        if (ignore) return;
        reportError(err, { stage: 'resolve-tenant' });
        setError('No se pudo resolver la empresa activa.');
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  // Carga métricas al cambiar el modelo o resolverse el tenant.
  useEffect(() => {
    if (tenantId === undefined) return; // aún resolviendo el tenant
    if (tenantId === null) {
      setData(null);
      setError(null);
      setDegraded(false);
      setLoading(false);
      return;
    }

    let ignore = false;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const { data: rpcData, error: rpcError } = await callMetricsRpc(
          RPC_BY_MODEL[model],
          tenantId,
          controller.signal,
        );
        if (ignore) return;

        if (rpcError) {
          if (isNotDeployed(rpcError)) {
            // Degradación elegante: la RPC aún no existe → mock temporal (visible).
            reportError(rpcError, { stage: 'metrics-rpc', model, degraded: true });
            const mock = await fetchMockMetrics(model, controller.signal);
            if (ignore) return;
            setData(mock);
            setDegraded(true);
            setLoading(false);
            return;
          }
          // RPC existe pero falló (RLS, permisos, timeout): fallar ruidosamente.
          reportError(rpcError, { stage: 'metrics-rpc', model, degraded: false });
          setError('No se pudieron cargar las métricas. Inténtalo nuevamente.');
          setDegraded(false);
          setLoading(false);
          return;
        }

        let resolvedData = rpcData ?? {};
        if (model === 'startup-saas') {
          const period = new Date().toISOString().slice(0, 7);
          const growthResult = await supabase.rpc('saas_growth_metrics', { p_tenant_id: tenantId, p_period: period }).abortSignal(controller.signal);
          if (ignore) return;
          if (growthResult.error) {
            if (!isNotDeployed(growthResult.error)) throw growthResult.error;
            reportError(growthResult.error, { stage: 'saas-growth-rpc', degraded: true });
          } else {
            resolvedData = withSaasGrowth(resolvedData, growthResult.data as unknown as SaasGrowthMetrics);
          }
          const retentionResult = await supabase.rpc('saas_retention_metrics', { p_tenant_id: tenantId, p_months: 6 }).abortSignal(controller.signal);
          if (ignore) return;
          if (retentionResult.error) {
            if (!isNotDeployed(retentionResult.error)) throw retentionResult.error;
            reportError(retentionResult.error, { stage: 'saas-retention-rpc', degraded: true });
          } else {
            resolvedData = withSaasRetention(resolvedData, retentionResult.data as unknown as SaasRetentionMetrics);
          }
          const riskResult=await supabase.rpc('saas_customer_risk',{p_tenant_id:tenantId}).abortSignal(controller.signal);
          if(ignore)return;
          if(riskResult.error){if(!isNotDeployed(riskResult.error))throw riskResult.error;reportError(riskResult.error,{stage:'saas-risk-rpc',degraded:true});}
          else resolvedData=withSaasRisk(resolvedData,riskResult.data as unknown as SaasRiskReport);
          const renewalResult=await supabase.rpc('saas_renewal_workspace',{p_tenant_id:tenantId}).abortSignal(controller.signal);if(ignore)return;if(renewalResult.error){if(!isNotDeployed(renewalResult.error))throw renewalResult.error;}else resolvedData=withRenewals(resolvedData,renewalResult.data as unknown as RenewalWorkspace);
        }
        setData(resolvedData);
        setDegraded(false);
        setLoading(false);
      } catch (err: unknown) {
        if (ignore) return;
        if (err instanceof DOMException && err.name === 'AbortError') return; // cambio de modelo
        reportError(err, { stage: 'metrics-rpc', model });
        setError('No se pudieron cargar las métricas. Inténtalo nuevamente.');
        setDegraded(false);
        setLoading(false);
      }
    })();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [model, tenantId]);

  return { model, data, loading, error, degraded };
}
