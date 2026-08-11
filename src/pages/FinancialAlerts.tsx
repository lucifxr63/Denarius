import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BellRing, CheckCircle2, LoaderCircle, ShieldAlert } from 'lucide-react';
import { getDefaultTenant, getFinancialAlertCenter, type FinancialAlertCenter, type FinancialAlert } from '@/lib/queries';
import { DecisionJourney } from '@/components/decision-story/DecisionJourney';

type Filter = 'ALL' | 'CRITICAL' | 'WARNING';
const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const styles = {
  CRITICAL: 'border-danger/35 bg-danger/5', WARNING: 'border-amber/35 bg-amber/5', INFO: 'border-primary/30 bg-primary/5',
} as const;
const labels = { CRITICAL: 'Crítica', WARNING: 'Advertencia', INFO: 'Informativa' } as const;

function AlertIcon({ severity }: { severity: FinancialAlert['severity'] }) {
  return severity === 'CRITICAL' ? <ShieldAlert className="size-5" aria-hidden="true" /> : <AlertTriangle className="size-5" aria-hidden="true" />;
}

export function FinancialAlerts() {
  const [center, setCenter] = useState<FinancialAlertCenter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const tenant = await getDefaultTenant();
        if (!tenant) throw new Error('No encontramos una empresa activa.');
        const result = await getFinancialAlertCenter(tenant.id);
        if (alive) setCenter(result);
      } catch (cause) { if (alive) setError(cause instanceof Error ? cause.message : 'No pudimos cargar las alertas.'); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);
  const visible = useMemo(() => center?.alerts.filter((alert) => filter === 'ALL' || alert.severity === filter) ?? [], [center, filter]);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <DecisionJourney active={2} />
        <div className="flex items-start gap-3"><span className="grid size-11 place-items-center rounded-xl bg-primary/15 text-primary"><BellRing className="size-5" aria-hidden="true" /></span><div><p className="text-sm font-semibold text-primary">Prioridad financiera</p><h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Cola de alertas</h1><p className="mt-2 max-w-3xl text-muted-foreground">Atiende primero las señales críticas. Cada elemento explica el impacto y enlaza a la acción que lo resuelve.</p></div></div>
        {loading ? <div className="grid min-h-64 place-items-center text-sm text-muted-foreground" role="status"><span className="flex items-center gap-2"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Calculando alertas…</span></div>
          : error ? <div role="alert" className="mt-8 rounded-xl border border-danger/30 bg-danger/5 p-5 text-danger">{error}</div>
          : center && <>
            <section aria-label="Filtrar alertas por prioridad" className="mt-8 grid gap-3 sm:grid-cols-3">
              <SummaryButton label="Todas activas" value={center.summary.total} active={filter === 'ALL'} onClick={() => setFilter('ALL')} tone="text-primary" />
              <SummaryButton label="Críticas" value={center.summary.critical} active={filter === 'CRITICAL'} onClick={() => setFilter('CRITICAL')} tone="text-danger" />
              <SummaryButton label="Advertencias" value={center.summary.warning} active={filter === 'WARNING'} onClick={() => setFilter('WARNING')} tone="text-amber" />
            </section>
            <AlertDistribution critical={center.summary.critical} warning={center.summary.warning} info={center.summary.info} total={center.summary.total} />
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Trabajo pendiente</h2><p className="text-sm text-muted-foreground">{visible.length} señal(es) en esta vista, ordenadas por el motor financiero.</p></div><Link to="/weekly-close" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">Ir al cierre semanal <ArrowRight className="size-4" aria-hidden="true" /></Link></div>
            <section className="mt-4 space-y-4" aria-label="Alertas priorizadas">
              {visible.length === 0 ? <div className="rounded-2xl border border-border bg-card p-10 text-center"><CheckCircle2 className="mx-auto size-9 text-primary" aria-hidden="true" /><h2 className="mt-3 text-lg font-semibold">Sin alertas en esta prioridad</h2><p className="mt-1 text-sm text-muted-foreground">Selecciona otra vista o continúa con el cierre semanal.</p></div>
                : visible.map((alert, index) => <article key={alert.id} className={`rounded-2xl border p-5 ${styles[alert.severity]}`}><div className="flex flex-col gap-4 sm:flex-row sm:items-start"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${alert.severity === 'CRITICAL' ? 'bg-danger/15 text-danger' : 'bg-amber/15 text-amber'}`}><AlertIcon severity={alert.severity} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-current/20 px-2 py-0.5 text-xs font-bold">{labels[alert.severity]}</span><span className="text-xs font-medium text-muted-foreground">Prioridad {index + 1} · {alert.kind}</span></div><h3 className="mt-2 text-lg font-semibold">{alert.title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{alert.message}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">{typeof alert.amount === 'number' && <span><strong>Impacto:</strong> {money.format(alert.amount)}</span>}{alert.due_date && <span><strong>Fecha:</strong> {alert.due_date}</span>}</div></div><Link to={alert.deep_link} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">{alert.action_label}<ArrowRight className="size-4" aria-hidden="true" /></Link></div></article>)}
            </section>
            <p className="mt-5 text-xs text-muted-foreground">Corte: {new Intl.DateTimeFormat('es-CL', { dateStyle: 'long' }).format(new Date(`${center.as_of}T12:00:00`))}. No se incluyen nombres ni datos personales en estas señales.</p>
          </>}
      </main>
    </div>
  );
}

function AlertDistribution({critical,warning,info,total}:{critical:number;warning:number;info:number;total:number}){const safe=Math.max(total,1),parts=[{label:'Críticas',value:critical,cls:'bg-danger'},{label:'Advertencias',value:warning,cls:'bg-amber'},{label:'Informativas',value:info,cls:'bg-primary'}];return <section aria-labelledby="alert-map-title" className="mt-5 rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold text-primary">Capítulo 2 · La tensión</p><h2 id="alert-map-title" className="mt-1 text-lg font-semibold">Dónde se concentra la presión</h2></div><p className="text-sm text-muted-foreground">{critical>0?'Empieza por las críticas; pueden alterar el cierre.':'No hay alertas críticas en este corte.'}</p></div><div className="mt-4 flex h-4 overflow-hidden rounded-full bg-muted" role="img" aria-label={`Distribución: ${critical} críticas, ${warning} advertencias y ${info} informativas`}>{parts.map(p=>p.value>0&&<span key={p.label} className={p.cls} style={{width:`${p.value/safe*100}%`}}/>)}</div><dl className="mt-3 grid grid-cols-3 gap-2">{parts.map(p=><div key={p.label}><dt className="text-xs text-muted-foreground">{p.label}</dt><dd className="font-bold">{p.value}</dd></div>)}</dl></section>}

function SummaryButton({ label, value, tone, active, onClick }: { label: string; value: number; tone: string; active: boolean; onClick: () => void }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`min-h-24 cursor-pointer rounded-xl border bg-card p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${active ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:bg-muted/50'}`}><span className="text-sm text-muted-foreground">{label}</span><span className={`mt-1 block text-3xl font-bold ${tone}`}>{value}</span></button>;
}
