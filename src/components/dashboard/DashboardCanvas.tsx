import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BellRing, ChevronDown, ClipboardCheck, PlusCircle, TriangleAlert } from 'lucide-react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { getDashboardLayout } from '@/config/dashboards';
import { useDashboardMetricsPayload } from '@/hooks/useDashboardMetricsPayload';
import { WIDGET_REGISTRY } from './widgets';
import { useDashboardSlot, resolveAction, LIST_WIDGET_REGISTRY, ACTION_WIDGET_REGISTRY } from './slotContract';

const SPAN_CLASS: Record<number, string> = {
  4: 'lg:col-span-4',
  6: 'lg:col-span-6',
  8: 'lg:col-span-8',
  12: 'lg:col-span-12',
};

const STARTUP_DECISION_WIDGETS = new Set([
  'burnRateWidget',
  'runwayWidget',
  'mrrWidget',
  'mrrGrowthWidget',
  'atRiskMrrWidget',
  'overdueRenewalsWidget',
]);

function UnregisteredSlot({ id }: { id: string }) {
  return <div className="h-full rounded-xl border border-dashed border-amber/50 bg-amber/5 p-5 text-sm text-amber">Widget no registrado: <code>{id}</code></div>;
}

function NeedsProviderSlot({ title }: { title: string }) {
  return (
    <div className="h-full rounded-xl border border-dashed border-border bg-card/40 p-5">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">Slot interactivo · requiere conexión con el proveedor del dashboard.</p>
    </div>
  );
}

export function DashboardCanvas() {
  const model = useWorkspaceStore((state) => state.model);
  const layout = getDashboardLayout(model);
  const { data, loading, error, degraded } = useDashboardMetricsPayload();
  const slotCtx = useDashboardSlot();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const decisionWidgets = model === 'startup-saas'
    ? layout.widgets.filter((slot) => STARTUP_DECISION_WIDGETS.has(slot.widgetId))
    : layout.widgets;
  const advancedWidgets = model === 'startup-saas'
    ? layout.widgets.filter((slot) => !STARTUP_DECISION_WIDGETS.has(slot.widgetId))
    : [];
  const attentionCount = Object.values(data ?? {}).filter((metric) => metric.tone === 'negative' || metric.tone === 'warning').length;

  const renderWidgets = (widgets: typeof layout.widgets) => widgets.map((slot, index) => {
    const kind = slot.kind ?? 'metric';
    let content: ReactNode;
    if (kind === 'list') {
      const ListWidget = LIST_WIDGET_REGISTRY[slot.widgetId];
      if (!ListWidget) content = <UnregisteredSlot id={slot.widgetId} />;
      else if (!slotCtx || !slot.collection) content = <NeedsProviderSlot title={slot.title} />;
      else content = <ListWidget title={slot.title} items={slotCtx.collections[slot.collection]} />;
    } else if (kind === 'action-form') {
      const ActionWidget = ACTION_WIDGET_REGISTRY[slot.widgetId];
      if (!ActionWidget) content = <UnregisteredSlot id={slot.widgetId} />;
      else if (!slotCtx || !slot.binding) content = <NeedsProviderSlot title={slot.title} />;
      else content = <ActionWidget title={slot.title} action={resolveAction(slotCtx.orchestrator, slot.binding)} />;
    } else {
      const MetricWidget = WIDGET_REGISTRY[slot.widgetId];
      content = MetricWidget
        ? <MetricWidget title={slot.title} metric={loading ? undefined : data?.[slot.widgetId]} />
        : <UnregisteredSlot id={slot.widgetId} />;
    }
    return <div key={`${slot.widgetId}-${index}`} className={SPAN_CLASS[slot.span]}>{content}</div>;
  });

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Vista financiera</p>
          <h1 className="font-display text-3xl font-bold tracking-tight">{layout.title}</h1>
          <p className="mt-1 text-muted-foreground">{layout.subtitle}</p>
        </div>
        <Link to="/data-quality" className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 lg:self-auto">
          Verificar calidad de datos <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <section aria-labelledby="next-actions-title" className="mb-6 rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${attentionCount > 0 ? 'bg-amber/15 text-amber' : 'bg-primary/15 text-primary'}`}>
              {attentionCount > 0 ? <TriangleAlert className="size-5" aria-hidden="true" /> : <ClipboardCheck className="size-5" aria-hidden="true" />}
            </span>
            <div>
              <h2 id="next-actions-title" className="font-semibold">{attentionCount > 0 ? `${attentionCount} señal(es) requieren revisión` : 'Tu operación está lista para continuar'}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Registra cambios, resuelve riesgos y deja trazabilidad semanal desde aquí.</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Link to="/operations#quick-entry" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"><PlusCircle className="size-4" aria-hidden="true" />Registrar</Link>
            <Link to="/alerts" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"><BellRing className="size-4" aria-hidden="true" />Revisar alertas</Link>
            <Link to="/weekly-close" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"><ClipboardCheck className="size-4" aria-hidden="true" />Cerrar semana</Link>
          </div>
        </div>
      </section>

      {error && <p role="alert" className="mb-6 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
      {degraded && <p className="mb-6 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">Datos simulados: el backend de métricas aún no está desplegado. Estos valores no son reales.</p>}

      {!loading && !error && data === null ? (
        <p className="rounded-lg border border-border bg-card/60 px-4 py-8 text-center text-sm text-muted-foreground">No hay una empresa configurada todavía. Completa la configuración para ver métricas por modelo.</p>
      ) : (
        <>
          <div className="mb-3"><h2 className="text-lg font-semibold">Señales para decidir</h2><p className="text-sm text-muted-foreground">Los indicadores que más afectan caja, crecimiento y riesgo.</p></div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">{renderWidgets(decisionWidgets)}</div>
          {advancedWidgets.length > 0 && (
            <section className="mt-6 border-t border-border pt-6">
              <button type="button" aria-expanded={showAdvanced} aria-controls="advanced-metrics" onClick={() => setShowAdvanced((value) => !value)} className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                <span><span className="block text-sm font-semibold">Análisis avanzado</span><span className="block text-xs text-muted-foreground">{advancedWidgets.length} indicadores adicionales de eficiencia, retención y renovaciones</span></span>
                <ChevronDown className={`size-5 shrink-0 transition-transform motion-reduce:transition-none ${showAdvanced ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              {showAdvanced && <div id="advanced-metrics" className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">{renderWidgets(advancedWidgets)}</div>}
            </section>
          )}
        </>
      )}
    </section>
  );
}
