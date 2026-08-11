import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, LoaderCircle, Save, TrendingUp, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useConfirm } from '@/components/ui/confirm';
import { CashStoryChart } from '@/components/weekly-close/CashStoryChart';
import { trackExperience } from '@/lib/experience';
import { DecisionJourney } from '@/components/decision-story/DecisionJourney';
import {
  completeWeeklyClose,
  getDefaultTenant,
  getDenariusAccessContext,
  getWeeklyCloseWorkspace,
  saveUnitEconomicsInput,
  type WeeklyCloseWorkspace,
} from '@/lib/queries';

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' });
const inputClass = 'h-11 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20';
const labels: Record<string, string> = {
  INCOMPLETE: 'Faltan datos',
  HEALTHY: 'Economía saludable',
  WATCH: 'Requiere atención',
  UNVIABLE: 'No viable con estos supuestos',
};

export function WeeklyClose() {
  const confirm = useConfirm();
  const [tenant, setTenant] = useState<{ id: string } | null>(null);
  const [data, setData] = useState<WeeklyCloseWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [acq, setAcq] = useState('0');
  const [delivery, setDelivery] = useState('0');
  const [units, setUnits] = useState('');
  const [customers, setCustomers] = useState('');
  const [note, setNote] = useState('');
  const [justClosed, setJustClosed] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);

  async function load(id?: string) {
    const currentTenant = id ? { id } : await getDefaultTenant();
    if (!currentTenant) throw new Error('No encontramos una empresa activa.');
    setTenant(currentTenant);
    const [workspace, access] = await Promise.all([getWeeklyCloseWorkspace(currentTenant.id), getDenariusAccessContext(currentTenant.id)]);
    setPermissions(access.permissions);
    setData(workspace);
    if (workspace.inputs) {
      setAcq(String(workspace.inputs.acquisition_spend)); setDelivery(String(workspace.inputs.delivery_costs));
      setUnits(workspace.inputs.units_sold === null ? '' : String(workspace.inputs.units_sold));
      setCustomers(workspace.inputs.customers_acquired === null ? '' : String(workspace.inputs.customers_acquired));
    }
  }

  useEffect(() => {
    void load().catch((error) => toast.error(error.message)).finally(() => setLoading(false));
  }, []);

  async function saveInputs() {
    if (!tenant || !data) return;
    setSaving(true);
    try {
      await saveUnitEconomicsInput({
        tenantId: tenant.id,
        period: data.as_of.slice(0, 7),
        acquisitionSpend: Number(acq),
        deliveryCosts: Number(delivery),
        unitsSold: units ? Number(units) : null,
        customersAcquired: customers ? Number(customers) : null,
      });
      await load(tenant.id);
      toast.success('Supuestos actualizados');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No pudimos guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function close() {
    if (!tenant || !data || !acknowledged) return;
    const withRisks = data.alerts.summary.critical > 0;
    const approved = await confirm({
      title: withRisks ? '¿Registrar cierre con riesgos?' : '¿Registrar cierre semanal?',
      message: `Se guardará el snapshot al ${date.format(new Date(`${data.as_of}T12:00:00`))} con ${data.alerts.summary.total} alerta(s) activa(s). Esta acción quedará en el historial.`,
      confirmLabel: withRisks ? 'Cerrar con riesgos' : 'Registrar cierre',
      danger: withRisks,
    });
    if (!approved) return;
    setSaving(true);
    try {
      await completeWeeklyClose(tenant.id, data.as_of, note);
      void trackExperience('CLOSE_COMPLETED', 'WEEKLY_CLOSE', tenant.id).catch(() => undefined);
      await load(tenant.id);
      setJustClosed(true);
      setAcknowledged(false);
      setNote('');
      toast.success('Cierre semanal registrado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No pudimos cerrar la semana.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="grid min-h-screen place-items-center"><LoaderCircle className="size-5 animate-spin" /></div>;

  const completedChecklist = data?.checklist.filter((item) => item.done).length ?? 0;
  const totalChecklist = data?.checklist.length ?? 0;
  const readiness = totalChecklist ? Math.round((completedChecklist / totalChecklist) * 100) : 0;
  const hasCritical = (data?.alerts.summary.critical ?? 0) > 0;
  const missingInputs = data?.unit_economics.missing_inputs.length ?? 0;
  const fullyReady = readiness === 100 && !hasCritical && missingInputs === 0;
  const latestClose = data?.history[0];
  const previousClose = data?.history[1];
  const latestCash = Number(latestClose?.snapshot?.core?.current_cash ?? data?.core.current_cash ?? 0);
  const previousCash = previousClose ? Number(previousClose.snapshot?.core?.current_cash ?? 0) : null;
  const cashDelta = previousCash === null ? null : latestCash - previousCash;
  const canPrepare = permissions.includes('financial.write');
  const canClose = permissions.includes('close.manage');

  return <div className="min-h-screen bg-background">
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium hover:text-primary"><ArrowLeft className="size-4" />Volver al dashboard</Link>
        <ThemeToggle />
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <DecisionJourney active={4} />
      <div className="flex gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary"><ClipboardCheck className="size-5" /></span>
        <div><p className="text-sm font-semibold text-primary">Control semanal</p><h1 className="font-display text-3xl font-bold">Cierre semanal</h1><p className="mt-2 max-w-3xl text-muted-foreground">Confirma la calidad de los datos, los riesgos y la viabilidad antes de guardar una fotografía financiera de la semana.</p></div>
      </div>

      {data && <>
        {latestClose && <section aria-labelledby="outcome-title" className={`mt-8 rounded-2xl border p-5 sm:p-6 ${justClosed ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'}`}>
          <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary"><Check className="size-5" /></span><div><p className="text-sm font-semibold text-primary">{justClosed ? 'Cierre registrado' : 'Último cierre'}</p><h2 id="outcome-title" className="text-xl font-semibold">Resultado de la semana</h2><p className="mt-1 text-sm text-muted-foreground">Semana del {latestClose.week_start} · {latestClose.status === 'CLOSED' ? 'sin riesgos críticos' : 'con riesgos pendientes'}</p></div></div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">Snapshot guardado</span></div>
          <dl className="mt-5 grid gap-3 sm:grid-cols-3"><Metric label="Caja al cierre" value={money.format(latestCash)} /><Metric label="Cambio semanal" value={cashDelta === null ? 'Primera línea base' : `${cashDelta >= 0 ? '+' : ''}${money.format(cashDelta)}`} /><Metric label="Alertas críticas" value={String(latestClose.snapshot?.alerts?.summary?.critical ?? 0)} /></dl>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]"><div><h3 className="text-sm font-semibold">Próximas acciones recomendadas</h3><ul className="mt-2 grid gap-2 text-sm text-muted-foreground">{recommendedActions(data).map((action) => <li key={action} className="flex gap-2"><ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" />{action}</li>)}</ul></div><Link to={data.unit_economics.business_model === 'startup-saas' ? '/subscriptions' : '/operations#collections'} className="inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted"><TrendingUp className="size-4" />Continuar la semana</Link></div>
        </section>}
        {data.action_outcome && data.action_outcome.total_actions > 0 && <section aria-labelledby="action-outcome-title" className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-primary">Seguimiento del plan</p><h2 id="action-outcome-title" className="mt-1 text-xl font-semibold">De la decisión al resultado</h2><p className="mt-1 text-sm text-muted-foreground">Plan de la semana {data.action_outcome.plan_week_start}</p></div><Link to="/action-plan" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted">Ver acciones<ArrowRight className="size-4" /></Link></div>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Acciones completadas" value={`${data.action_outcome.completed_actions} de ${data.action_outcome.total_actions}`} /><Metric label="Acciones vencidas" value={String(data.action_outcome.overdue_actions)} /><Metric label="Impacto esperado declarado" value={data.action_outcome.expected_cash_impact === null ? 'No informado' : money.format(data.action_outcome.expected_cash_impact)} /><Metric label="Variación real de caja" value={data.action_outcome.actual_cash_change === null ? 'Requiere otro cierre' : `${data.action_outcome.actual_cash_change >= 0 ? '+' : ''}${money.format(data.action_outcome.actual_cash_change)}`} /></dl>
          <p className="mt-4 rounded-lg bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">La variación de caja incluye toda la operación del período. Compararla con el impacto esperado ayuda a revisar supuestos, pero no demuestra que las acciones hayan causado el cambio.</p>
        </section>}
        <section aria-labelledby="readiness-title" className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-sm font-medium text-muted-foreground">Preparación del cierre</p><h2 id="readiness-title" className="mt-1 text-xl font-semibold">{fullyReady ? 'Listo para cerrar' : hasCritical ? 'Cierre con riesgos' : 'Revisión incompleta'}</h2><p className="mt-1 text-sm text-muted-foreground">{completedChecklist} de {totalChecklist} verificaciones completas · corte al {date.format(new Date(`${data.as_of}T12:00:00`))}</p></div>
            <span className={`rounded-full px-3 py-1 text-sm font-bold ${fullyReady ? 'bg-primary/10 text-primary' : hasCritical ? 'bg-danger/10 text-danger' : 'bg-amber/10 text-amber'}`}>{readiness}% revisado</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Progreso de preparación del cierre" aria-valuemin={0} aria-valuemax={100} aria-valuenow={readiness}><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${readiness}%` }} /></div>
          {!fullyReady && <div className="mt-4 flex flex-wrap gap-3 text-sm">
            {readiness < 100 && <Link to="/data-quality" className="font-semibold text-primary underline-offset-4 hover:underline">Completar calidad de datos</Link>}
            {hasCritical && <Link to="/alerts" className="font-semibold text-danger underline-offset-4 hover:underline">Revisar {data.alerts.summary.critical} alerta(s) crítica(s)</Link>}
          </div>}
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3"><Card label="Caja actual" value={money.format(Number(data.core.current_cash ?? 0))} /><Card label="Runway" value={data.core.runway_months === null ? 'Sin burn' : `${Number(data.core.runway_months).toFixed(1)} meses`} /><Card label="Alertas activas" value={`${data.alerts.summary.total} (${data.alerts.summary.critical} críticas)`} /></section>

        <CashStoryChart history={data.history} current={Number(data.core.current_cash ?? 0)} />

        <section className="mt-6 grid gap-6 lg:grid-cols-[.95fr_1.05fr]">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">1. Verifica el corte</h2>
            <ul className="mt-4 space-y-3">{data.checklist.map((item) => <li key={item.id} className="flex items-start gap-2 text-sm">{item.done ? <Check className="mt-0.5 size-4 shrink-0 text-primary" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber" />}<span>{item.label}</span></li>)}</ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-semibold">2. Confirma la viabilidad</h2><p className="text-sm text-muted-foreground">{data.unit_economics.business_model === 'startup-saas' ? 'Startup SaaS' : 'PyME tradicional'} · {data.unit_economics.period}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${data.unit_economics.assessment === 'HEALTHY' ? 'bg-primary/10 text-primary' : data.unit_economics.assessment === 'UNVIABLE' ? 'bg-danger/10 text-danger' : 'bg-amber/10 text-amber'}`}>{labels[data.unit_economics.assessment]}</span></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><Metric label="ARPA / ingreso cliente" value={moneyOrDash(data.unit_economics.metrics.arpa)} /><Metric label="Margen" value={pct(data.unit_economics.metrics.gross_or_contribution_margin)} /><Metric label="CAC" value={moneyOrDash(data.unit_economics.metrics.cac)} />{data.unit_economics.business_model === 'startup-saas' ? <><Metric label="LTV / CAC" value={data.unit_economics.metrics.ltv_cac_ratio === null ? '—' : `${data.unit_economics.metrics.ltv_cac_ratio.toFixed(1)}×`} /><Metric label="Payback CAC" value={data.unit_economics.metrics.cac_payback_months === null ? '—' : `${data.unit_economics.metrics.cac_payback_months.toFixed(1)} meses`} /></> : <Metric label="Retorno sobre CAC" value={data.unit_economics.metrics.ltv_cac_ratio === null ? '—' : `${data.unit_economics.metrics.ltv_cac_ratio.toFixed(1)}×`} />}</div>
            {data.unit_economics.business_model === 'pyme-tradicional' && <p className="mt-4 text-xs leading-5 text-muted-foreground">El ingreso se obtiene de facturas por cobrar emitidas en el período. Los aportes de capital y movimientos bancarios no se consideran ventas. <Link className="font-semibold text-primary hover:underline" to="/operations#quick-entry">Registrar factura</Link></p>}
            {missingInputs > 0 && <p className="mt-4 rounded-lg bg-amber/10 p-3 text-sm text-amber">Faltan datos para evaluar: {data.unit_economics.missing_inputs.join(', ')}.</p>}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">3. Revisa el snapshot y registra</h2><p className="mt-1 text-sm text-muted-foreground">El historial conservará este resumen; las alertas pendientes seguirán visibles después del cierre.</p>
          <dl className="mt-4 grid gap-3 rounded-xl bg-muted/40 p-4 sm:grid-cols-3"><Snapshot label="Fecha de corte" value={date.format(new Date(`${data.as_of}T12:00:00`))} /><Snapshot label="Verificaciones" value={`${completedChecklist} de ${totalChecklist}`} /><Snapshot label="Resultado" value={hasCritical ? 'Con riesgos' : 'Sin riesgos críticos'} /></dl>
          {canClose ? <><label className="mt-5 block text-sm font-medium">Nota del cierre <span className="font-normal text-muted-foreground">(opcional)</span><textarea className="mt-1.5 min-h-24 w-full rounded-lg border border-border bg-background p-3 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Decisiones tomadas, riesgos aceptados o próximos pasos." /></label>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 text-sm"><input className="mt-0.5 size-5 accent-primary" type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /><span><strong className="block">Revisé este resumen</strong><span className="text-muted-foreground">Entiendo que se guardará un snapshot y que los riesgos no se resolverán automáticamente.</span></span></label>
          <Button className="mt-4 w-full sm:w-auto" disabled={saving || !acknowledged} onClick={() => void close()}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <ClipboardCheck className="size-4" />}{hasCritical ? 'Registrar cierre con riesgos' : 'Registrar cierre'}</Button></> : <RoleNotice text="Puedes revisar el cierre, pero solo Administración o Finanzas puede aprobar y registrar el snapshot semanal." />}
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-card p-5"><h2 className="text-lg font-semibold">Ajustar supuestos del período</h2><p className="mt-1 text-sm text-muted-foreground">Costos de adquisición y entrega no deben mezclarse con gastos generales. Corrígelos antes del cierre si es necesario.</p>{canPrepare ? <><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Adquisición / marketing" value={acq} set={setAcq} /><Field label="Costo directo de entrega" value={delivery} set={setDelivery} /><Field label="Unidades vendidas" value={units} set={setUnits} /><Field label="Clientes adquiridos" value={customers} set={setCustomers} /></div><Button className="mt-4" variant="outline" disabled={saving} onClick={() => void saveInputs()}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}Calcular nuevamente</Button></> : <RoleNotice text="Estos supuestos son visibles para tu rol, pero requieren permiso de escritura financiera para modificarse." />}</section>

        <section className="mt-6"><h2 className="text-lg font-semibold">Historial de cierres</h2>{data.history.length === 0 ? <p className="mt-3 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">Aún no hay cierres registrados.</p> : <div className="mt-3 grid gap-3">{data.history.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"><div><p className="font-medium">Semana del {item.week_start}</p><p className="text-sm text-muted-foreground">{item.note || 'Sin nota'}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === 'CLOSED' ? 'bg-primary/10 text-primary' : 'bg-amber/10 text-amber'}`}>{item.status === 'CLOSED' ? 'Cerrado' : 'Cerrado con riesgos'}</span></article>)}</div>}</section>
      </>}
    </main>
  </div>;
}

function Card({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>; }
function RoleNotice({text}:{text:string}){return <p role="status" className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">{text}</p>}
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-muted/40 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>; }
function Snapshot({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>; }
function Field({ label, value, set }: { label: string; value: string; set: (value: string) => void }) { return <label className="text-sm font-medium">{label}<input type="number" min="0" className={`${inputClass} mt-1.5`} value={value} onChange={(event) => set(event.target.value)} /></label>; }
function pct(value: number | null) { return value === null ? '—' : `${(value * 100).toFixed(1).replace('.', ',')}%`; }
function moneyOrDash(value: number | null) { return value === null ? '—' : money.format(value); }
function recommendedActions(data: WeeklyCloseWorkspace) {
  if (data.unit_economics.business_model === 'startup-saas') return [data.alerts.summary.critical ? 'Resolver alertas críticas antes de aumentar el burn.' : 'Mantener vigilancia sobre burn y runway.', 'Revisar MRR, churn y renovaciones de la próxima semana.', data.unit_economics.assessment === 'HEALTHY' ? 'Validar si el crecimiento eficiente permite invertir más.' : 'Completar o mejorar los unit economics.'];
  return [data.alerts.summary.critical ? 'Priorizar cobros y obligaciones que presionan la caja.' : 'Revisar las facturas próximas a vencer.', 'Confirmar nómina, impuestos y proveedores de la próxima semana.', data.unit_economics.assessment === 'HEALTHY' ? 'Proteger el margen antes de asumir nuevos gastos.' : 'Revisar precios, costos directos y facturación del período.'];
}
