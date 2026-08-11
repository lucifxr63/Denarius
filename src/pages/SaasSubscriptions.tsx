import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, History, Plus, RefreshCcw, Repeat2, Save, UserRoundX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getDefaultTenant } from '@/lib/queries';
import {
  createSaasSubscription, listSaasSubscriptionHistory, listSaasSubscriptions, updateSaasSubscription, updateSaasRenewal,
  type SaasMrrEventRow, type SaasMrrEventType, type SaasSubscriptionRow,
} from '@/lib/saas-subscriptions';
import { formatCLP } from '@/lib/utils';
import { getSaasRetentionMetrics, type SaasRetentionMetrics } from '@/lib/saas-retention';
import { getSaasCustomerRisk, type SaasRiskReport } from '@/lib/saas-risk';
import { getRenewalWorkspace, type RenewalWorkspace } from '@/lib/saas-renewals';

const today = () => new Date().toISOString().slice(0, 10);
const EVENT_LABEL: Record<SaasMrrEventType, string> = {
  NEW: 'Nuevo MRR', EXPANSION: 'Expansión', CONTRACTION: 'Contracción', CHURN: 'Churn', REACTIVATION: 'Reactivación',
};

function SubscriptionCard({ row, onChanged }: { row: SaasSubscriptionRow; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<SaasMrrEventRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState(row.plan);
  const [mrr, setMrr] = useState(String(row.current_mrr));
  const [effectiveDate, setEffectiveDate] = useState(today());
  const [note, setNote] = useState('');
  const [renewalDate,setRenewalDate]=useState(row.renewal_date??'');
  const [renewalOwner,setRenewalOwner]=useState(row.renewal_owner??'');
  const [renewalStatus,setRenewalStatus]=useState(row.renewal_status??'PENDING');
  const [renewalNote,setRenewalNote]=useState(row.renewal_note??'');

  const loadHistory = async () => {
    setLoadingHistory(true);
    try { setHistory(await listSaasSubscriptionHistory(row.id)); }
    catch { toast.error('No se pudo cargar el historial.'); }
    finally { setLoadingHistory(false); }
  };

  const toggleHistory = async () => {
    const next = !open; setOpen(next);
    if (next) await loadHistory();
  };

  const change = async (status: 'ACTIVE' | 'CHURNED') => {
    const nextMrr = Number(mrr);
    if (!plan.trim() || nextMrr <= 0) return toast.error('Plan y MRR deben ser válidos.');
    setSaving(true);
    try {
      const event = await updateSaasSubscription({ id: row.id, plan: plan.trim(), mrr: nextMrr, status, effectiveDate, note });
      toast.success(`${EVENT_LABEL[event]} registrado.`);
      setNote('');
      await onChanged();
      if (open) await loadHistory();
    } catch (error) {
      const message = error instanceof Error && error.message.includes('no_mrr_effect')
        ? 'Modifica el MRR antes de guardar.' : 'No se pudo registrar el cambio.';
      toast.error(message);
    } finally { setSaving(false); }
  };
  const saveRenewal=async()=>{if(!renewalDate)return toast.error('Define la fecha de renovación.');setSaving(true);try{await updateSaasRenewal({id:row.id,renewalDate,owner:renewalOwner,status:renewalStatus,note:renewalNote});toast.success('Seguimiento de renovación actualizado.');await onChanged();}catch{toast.error('No se pudo actualizar la renovación.');}finally{setSaving(false);}};

  return <article className="rounded-2xl border border-border bg-card p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><div className="font-medium">{row.customer}</div><div className="text-sm text-muted-foreground">{row.plan} · desde {row.started_at}</div></div>
      <div className="flex items-center gap-3">
        <div className="text-right"><div className="font-display font-bold">{formatCLP(row.current_mrr)}/mes</div><div className={row.status === 'ACTIVE' ? 'text-xs text-primary' : 'text-xs text-danger'}>{row.status === 'ACTIVE' ? 'Activa' : 'Churned'}</div></div>
        <button onClick={() => void toggleHistory()} aria-expanded={open} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm hover:bg-muted"><History className="size-4" /> Historial {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</button>
      </div>
    </div>
    {row.status==='ACTIVE'&&<div className="mt-3 grid gap-3 rounded-xl border border-primary/15 bg-primary/5 p-3 md:grid-cols-4"><label className="text-xs text-muted-foreground">Renovación<input type="date" value={renewalDate} onChange={e=>setRenewalDate(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"/></label><label className="text-xs text-muted-foreground">Responsable<input value={renewalOwner} onChange={e=>setRenewalOwner(e.target.value)} placeholder="Nombre o rol" className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"/></label><label className="text-xs text-muted-foreground">Estado<select value={renewalStatus} onChange={e=>setRenewalStatus(e.target.value as SaasSubscriptionRow['renewal_status'])} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"><option value="PENDING">Pendiente</option><option value="IN_PROGRESS">En gestión</option><option value="RENEWED">Renovada</option><option value="WILL_NOT_RENEW">No renueva</option></select></label><label className="text-xs text-muted-foreground">Nota<input value={renewalNote} onChange={e=>setRenewalNote(e.target.value)} maxLength={500} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"/></label><div className="md:col-span-4 md:text-right"><button disabled={saving} onClick={()=>void saveRenewal()} className="inline-flex h-9 items-center gap-2 rounded-lg border border-primary/30 px-3 text-sm font-medium text-primary hover:bg-primary/10"><Save className="size-4"/> Guardar renovación</button></div></div>}

    <div className="mt-4 grid gap-3 rounded-xl bg-muted/40 p-3 md:grid-cols-4">
      <label className="text-xs text-muted-foreground">Plan<input value={plan} onChange={(e) => setPlan(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground" /></label>
      <label className="text-xs text-muted-foreground">MRR nuevo<input type="number" min="1" value={mrr} onChange={(e) => setMrr(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground" /></label>
      <label className="text-xs text-muted-foreground">Fecha efectiva<input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground" /></label>
      <label className="text-xs text-muted-foreground">Nota opcional<input maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motivo del cambio" className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground" /></label>
      <div className="flex gap-2 md:col-span-4 md:justify-end">
        {row.status === 'ACTIVE' ? <>
          <button disabled={saving} onClick={() => void change('ACTIVE')} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"><Save className="size-4" /> Guardar cambio</button>
          <button disabled={saving} onClick={() => void change('CHURNED')} className="inline-flex h-9 items-center gap-2 rounded-lg border border-danger/30 px-3 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-60"><UserRoundX className="size-4" /> Registrar churn</button>
        </> : <button disabled={saving} onClick={() => void change('ACTIVE')} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"><RefreshCcw className="size-4" /> Reactivar</button>}
      </div>
    </div>

    {open && <div className="mt-4 border-t border-border pt-4">
      <h3 className="text-sm font-semibold">Historial MRR</h3>
      {loadingHistory ? <p className="mt-3 text-sm text-muted-foreground">Cargando historial…</p> : history.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Sin eventos registrados.</p> : <ol className="mt-3 space-y-3">{history.map((event) => <li key={event.id} className="grid gap-1 rounded-lg border border-border/70 p-3 text-sm sm:grid-cols-[130px_1fr_auto]">
        <div><span className="font-medium">{EVENT_LABEL[event.event_type]}</span><div className="text-xs text-muted-foreground">{event.effective_date}</div></div>
        <div><div>{event.previous_plan && event.resulting_plan ? `${event.previous_plan} → ${event.resulting_plan}` : event.resulting_plan ?? row.plan}</div>{event.note && <div className="text-xs text-muted-foreground">{event.note}</div>}</div>
        <div className={event.amount_delta < 0 ? 'font-medium text-danger' : 'font-medium text-primary'}>{event.amount_delta > 0 ? '+' : ''}{formatCLP(event.amount_delta)}</div>
      </li>)}</ol>}
    </div>}
  </article>;
}

export function SaasSubscriptions() {
  const [tenantId, setTenantId] = useState<string>();
  const [rows, setRows] = useState<SaasSubscriptionRow[]>([]);
  const [retention, setRetention] = useState<SaasRetentionMetrics>();
  const [risk, setRisk] = useState<SaasRiskReport>();
  const [renewals,setRenewals]=useState<RenewalWorkspace>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState(''); const [plan, setPlan] = useState(''); const [mrr, setMrr] = useState('');
  const [startedAt, setStartedAt] = useState(today());
  const reload = async (id = tenantId) => {
    if (id) {
      const [subscriptions, retentionMetrics, riskReport,renewalReport] = await Promise.all([listSaasSubscriptions(id), getSaasRetentionMetrics(id), getSaasCustomerRisk(id),getRenewalWorkspace(id)]);
      setRows(subscriptions); setRetention(retentionMetrics); setRisk(riskReport);setRenewals(renewalReport);
    }
  };
  useEffect(() => { getDefaultTenant().then(async (tenant) => { if (tenant) { setTenantId(tenant.id); await reload(tenant.id); } }).catch(() => toast.error('No se pudieron cargar las suscripciones.')).finally(() => setLoading(false)); }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!tenantId || !customer.trim() || !plan.trim() || Number(mrr) <= 0) return;
    setSaving(true);
    try { await createSaasSubscription({ tenantId, customer: customer.trim(), plan: plan.trim(), mrr: Number(mrr), startedAt }); await reload(tenantId); setCustomer(''); setPlan(''); setMrr(''); toast.success('Suscripción y Nuevo MRR registrados.'); }
    catch { toast.error('No se pudo crear la suscripción.'); } finally { setSaving(false); }
  };

  return <div className="min-h-screen bg-background">
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/90 px-4 py-4 backdrop-blur sm:px-6"><div className="flex items-center gap-2 font-display font-bold"><Repeat2 className="size-5 text-primary" /> Suscripciones SaaS</div><div className="flex gap-2"><ThemeToggle /><Link to="/dashboard" className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm hover:bg-muted"><ArrowLeft className="size-4" /> Dashboard</Link></div></header>
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[340px_1fr]">
      <form onSubmit={submit} className="h-fit rounded-2xl border border-border bg-card p-5"><h1 className="text-xl font-semibold">Nueva suscripción</h1><p className="mt-1 text-sm text-muted-foreground">Generará automáticamente un evento Nuevo MRR.</p>
        <label className="mt-5 block text-sm">Cliente<input value={customer} onChange={(e) => setCustomer(e.target.value)} required className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3" /></label>
        <label className="mt-4 block text-sm">Plan<input value={plan} onChange={(e) => setPlan(e.target.value)} required className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3" /></label>
        <label className="mt-4 block text-sm">MRR mensual (CLP)<input type="number" min="1" value={mrr} onChange={(e) => setMrr(e.target.value)} required className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3" /></label>
        <label className="mt-4 block text-sm">Inicio<input type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} required className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3" /></label>
        <button disabled={saving} className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-primary-foreground disabled:opacity-60"><Plus className="size-4" />{saving ? 'Guardando…' : 'Crear suscripción'}</button>
      </form>
      <section><h2 className="text-xl font-semibold">Clientes y planes</h2><p className="mt-1 text-sm text-muted-foreground">Gestiona upgrades, downgrades, churn y reactivaciones con trazabilidad.</p>
        {retention && <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[['NRR', retention.current.nrr], ['GRR', retention.current.grr], ['Logo churn', retention.current.logo_churn]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 font-display text-xl font-bold">{typeof value === 'number' ? `${(value * 100).toFixed(1).replace('.', ',')}%` : '—'}</div></div>)}
        </div>}
        <div className="mt-4 space-y-4">{loading ? <p className="text-sm text-muted-foreground">Cargando…</p> : rows.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Aún no existen suscripciones.</div> : rows.map((row) => <SubscriptionCard key={`${row.id}-${row.current_mrr}-${row.status}-${row.plan}`} row={row} onChanged={reload} />)}</div>
        {retention && retention.cohorts.length > 0 && <div className="mt-8"><h2 className="text-xl font-semibold">Cohortes de clientes</h2><p className="mt-1 text-sm text-muted-foreground">Retención del MRR agrupada por mes de alta.</p><div className="mt-4 overflow-x-auto rounded-2xl border border-border"><table className="w-full text-sm"><thead className="bg-muted/60 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Cohorte</th><th className="px-4 py-3">Clientes</th><th className="px-4 py-3">MRR inicial</th><th className="px-4 py-3">MRR actual</th><th className="px-4 py-3">Retención</th></tr></thead><tbody>{retention.cohorts.map((cohort) => <tr key={cohort.cohort} className="border-t border-border"><td className="px-4 py-3 font-medium">{cohort.cohort}</td><td className="px-4 py-3">{cohort.customers}</td><td className="px-4 py-3">{formatCLP(cohort.starting_mrr)}</td><td className="px-4 py-3">{formatCLP(cohort.current_mrr)}</td><td className="px-4 py-3 font-medium">{cohort.mrr_retention == null ? '—' : `${(cohort.mrr_retention * 100).toFixed(1).replace('.', ',')}%`}</td></tr>)}</tbody></table></div></div>}
        {risk && risk.accounts.length > 0 && <div className="mt-8"><h2 className="text-xl font-semibold">Salud de clientes</h2><p className="mt-1 text-sm text-muted-foreground">Ranking explicable por contracciones recientes y concentración de MRR.</p><div className="mt-4 space-y-2">{risk.accounts.map((account)=><div key={account.customer_id} className="grid gap-2 rounded-xl border border-border bg-card p-4 sm:grid-cols-[1fr_auto_auto]"><div><div className="font-medium">{account.customer}</div><div className="text-xs text-muted-foreground">{account.reasons.recent_contraction?'Contracción reciente · ':''}{account.reasons.concentration?'Alta concentración':'Sin alertas activas'}</div></div><div className="text-sm">{formatCLP(account.mrr)} · {(account.share*100).toFixed(1)}%</div><div className={account.risk_level==='HIGH'?'text-sm font-semibold text-danger':account.risk_level==='MEDIUM'?'text-sm font-semibold text-amber':'text-sm font-semibold text-primary'}>{account.score}/100 · {account.risk_level}</div></div>)}</div></div>}
        {renewals&&renewals.items.length>0&&<div className="mt-8"><h2 className="text-xl font-semibold">Agenda de renovaciones</h2><p className="mt-1 text-sm text-muted-foreground">Próximos contratos y acciones financieras sugeridas.</p><div className="mt-4 space-y-2">{renewals.items.map(item=><div key={item.subscription_id} className="grid gap-2 rounded-xl border border-border bg-card p-4 sm:grid-cols-[1fr_auto]"><div><div className="font-medium">{item.customer} · {item.plan}</div><div className="text-xs text-muted-foreground">{item.renewal_date} · {item.owner??'Sin responsable'} · {item.suggested_action}</div></div><div className={item.urgency==='OVERDUE'||item.urgency==='CRITICAL'?'font-semibold text-danger':'font-semibold text-amber'}>{item.days_remaining} días · {formatCLP(item.mrr)}</div></div>)}</div></div>}
      </section>
    </main>
  </div>;
}
