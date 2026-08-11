import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Wallet, LogOut, TrendingDown, Timer, Flame, Settings, RotateCcw, HelpCircle, LayoutGrid, BarChart3, FilePlus2, Upload, List, Repeat2, ShieldCheck, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Kpi } from '@/components/Kpi';
import { RestrictedCashKpi } from '@/components/RestrictedCashKpi';
import { ThemeToggle } from '@/components/ThemeToggle';
import { WorkspaceSwitcher } from '@/components/layout/WorkspaceSwitcher';
import { ProductHeader } from '@/components/layout/ProductHeader';
import { CashflowChart } from '@/components/CashflowChart';
import { DemoFinancialStory } from '@/components/dashboard/DemoFinancialStory';
import { StartupFinancialStory } from '@/components/dashboard/StartupFinancialStory';
import { DecisionJourney } from '@/components/decision-story/DecisionJourney';
import { BidsPanel } from '@/components/BidsPanel';
import { ChileCompraPanel } from '@/components/ChileCompraPanel';
import { InvoiceForm } from '@/components/InvoiceForm';
import { MovementForm } from '@/components/MovementForm';
import { ResolutionCenter } from '@/components/ResolutionCenter';
import { RecurringPanel } from '@/components/RecurringPanel';
import { AccountSetup } from '@/components/AccountSetup';
import { AccountsCard } from '@/components/AccountsCard';
import { InvoicesList } from '@/components/InvoicesList';
import { MovementsList } from '@/components/MovementsList';
import { TenantSettings } from '@/components/TenantSettings';
import { CsvTransactionImporter } from '@/components/CsvTransactionImporter';
import { WelcomeTour } from '@/components/WelcomeTour';
import { useCashflow } from '@/hooks/useCashflow';
import { useAuth } from '@/store/auth';
import { signOut } from '@/lib/auth';
import { formatCLP } from '@/lib/utils';
import {
  buildDailyProjection,
  aggregate,
  computeKpis,
  overdueReceivables,
  restrictedTax,
  minBalanceUntil,
  HORIZON_DAYS,
  type Granularity,
} from '@/lib/projection';
import { useBidsStore } from '@/store/useBidsStore';

export function Dashboard() {
  const { user } = useAuth();
  const cf = useCashflow();
  const [granularity, setGranularity] = useState<Granularity>('week');
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [tourOpen, setTourOpen] = useState(() => typeof localStorage !== 'undefined' && !localStorage.getItem('cf_tour_seen'));

  const closeTour = () => {
    setTourOpen(false);
    try { localStorage.setItem('cf_tour_seen', '1'); } catch { /* noop */ }
  };

  const today = useMemo(() => new Date(), []);
  const taxRate = Number(cf.tenant?.default_tax_rate ?? 0);

  const toggleIgnore = (id: string) =>
    setIgnored((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  // Simulador What-If: la proyección excluye los eventos "ocultos".
  const visInvoices = useMemo(() => cf.invoices.filter((i) => !ignored.has(i.id)), [cf.invoices, ignored]);
  const visRecurring = useMemo(() => cf.recurringTransactions.filter((r) => !ignored.has(r.id)), [cf.recurringTransactions, ignored]);

  const daily = useMemo(
    () => buildDailyProjection(cf.currentCash, visInvoices, today, HORIZON_DAYS[granularity], visRecurring, taxRate),
    [cf.currentCash, visInvoices, today, granularity, visRecurring, taxRate],
  );
  const chartData = useMemo(() => aggregate(daily, granularity), [daily, granularity]);

  // Fase 3: licitaciones simuladas (client-side). La curva "con licitación" solo
  // se calcula/grafica si hay al menos una oportunidad activa.
  const bids = useBidsStore((s) => s.bids);
  const addBid = useBidsStore((s) => s.addBid);
  const removeBid = useBidsStore((s) => s.removeBid);
  const toggleBid = useBidsStore((s) => s.toggleActive);
  const activeBids = useMemo(
    () => bids.filter((b) => b.active).map((b) => ({ id: b.id, amount: b.amount, payDate: b.payDate, probability: b.probability })),
    [bids],
  );
  const simDaily = useMemo(
    () =>
      activeBids.length === 0
        ? null
        : buildDailyProjection(cf.currentCash, visInvoices, today, HORIZON_DAYS[granularity], visRecurring, taxRate, activeBids),
    [activeBids, cf.currentCash, visInvoices, today, granularity, visRecurring, taxRate],
  );
  const simChartData = useMemo(() => (simDaily ? aggregate(simDaily, granularity) : null), [simDaily, granularity]);

  // Alerta de capital de trabajo (§3.2): si la caja BASE (sin el pago del contrato)
  // cae bajo cero antes de la fecha de pago de alguna licitación activa, hay que
  // financiar la ejecución mientras llega el pago estatal.
  const workingCapitalAlert = useMemo(() => {
    if (activeBids.length === 0) return null;
    const latestPay = activeBids.reduce((m, b) => (b.payDate > m ? b.payDate : m), activeBids[0].payDate);
    const valley = minBalanceUntil(daily, latestPay);
    if (valley && valley.balance < 0) return valley;
    return null;
  }, [activeBids, daily]);
  const kpis = useMemo(
    () => computeKpis(cf.currentCash, cf.transactions, daily, today, visRecurring, taxRate),
    [cf.currentCash, cf.transactions, daily, today, visRecurring, taxRate],
  );
  const restricted = useMemo(
    () => restrictedTax(visInvoices, visRecurring, today, HORIZON_DAYS[granularity], taxRate),
    [visInvoices, visRecurring, today, granularity, taxRate],
  );
  const overdue = useMemo(() => overdueReceivables(visInvoices, today), [visInvoices, today]);
  const pendingReceivables = useMemo(() => cf.invoices.filter(i=>i.type==='AR'&&i.status==='PENDING').reduce((sum,i)=>sum+Number(i.total_amount),0),[cf.invoices]);
  const pendingPayables = useMemo(() => cf.invoices.filter(i=>i.type==='AP'&&i.status==='PENDING').reduce((sum,i)=>sum+Number(i.total_amount),0),[cf.invoices]);
  const fixedIncome=useMemo(()=>cf.recurringTransactions.filter(r=>r.type==='IN').reduce((sum,r)=>sum+Number(r.amount),0),[cf.recurringTransactions]);
  const fixedCosts=useMemo(()=>cf.recurringTransactions.filter(r=>r.type==='OUT').reduce((sum,r)=>sum+Number(r.amount),0),[cf.recurringTransactions]);

  const runwayLabel =
    kpis.runwayMonths === null ? '∞' : kpis.runwayMonths > 24 ? '> 24 meses' : `${kpis.runwayMonths.toFixed(1)} meses`;
  const hasAccounts = cf.accounts.length > 0;
  const simActive = ignored.size > 0;
  const canManage = cf.permissions.includes('team.manage');
  const canFinancialWrite = cf.permissions.includes('financial.write');
  const canOperate = canFinancialWrite || cf.permissions.includes('operations.write');

  // Wrappers con toast de éxito para los formularios de creación.
  const addInvoice = async (v: Parameters<typeof cf.addInvoice>[0]) => {
    await cf.addInvoice(v);
    toast.success('Factura registrada');
  };
  const addTransaction = async (v: Parameters<typeof cf.addTransaction>[0]) => {
    await cf.addTransaction(v);
    toast.success('Movimiento registrado');
  };
  const addRecurring = async (v: Parameters<typeof cf.addRecurringTransaction>[0]) => {
    await cf.addRecurringTransaction(v);
    toast.success(v.type === 'IN' ? 'Ingreso fijo agregado' : 'Gasto fijo agregado');
  };
  const removeRecurring = async (id: string) => {
    await cf.removeRecurringTransaction(id);
    toast.success('Fijo eliminado');
  };
  const resolveOverdue = async (id: string, patch: { status?: 'PAID' | 'CANCELLED'; due_date?: string }) => {
    await cf.resolveInvoice(id, patch);
    toast.success('Factura actualizada');
  };

  return (
    <div className="min-h-screen">
      <ProductHeader
        actions={
          <>
            <Button variant="ghost" className="min-h-11 w-full justify-start" onClick={() => setTourOpen(true)}>
              <HelpCircle className="size-4" aria-hidden="true" /> Tutorial
            </Button>
            {cf.tenant && canManage && (
              <Button variant="ghost" className="min-h-11 w-full justify-start" onClick={() => setShowSettings(true)}>
                <Settings className="size-4" aria-hidden="true" /> Ajustes
              </Button>
            )}
            <Button variant="ghost" className="min-h-11 w-full justify-start" onClick={() => signOut()}>
              <LogOut className="size-4" aria-hidden="true" /> Cerrar sesión
            </Button>
          </>
        }
      />
      {false && (
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-3 py-4 backdrop-blur sm:px-6">
        <span className="flex items-center gap-2.5 font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary">
            <Wallet className="size-5" aria-hidden="true" />
          </span>
          <span className="hidden font-display text-lg font-bold sm:inline">Denarius</span>
        </span>
        <div className="flex items-center gap-2 sm:gap-3">
          <WorkspaceSwitcher />
          <Link
            to="/dashboard"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-transparent px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            aria-label="Vista por modelo"
          >
            <LayoutGrid className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Vista por modelo</span>
          </Link>
          <span className="hidden text-sm text-muted-foreground sm:inline">{user?.email}</span>
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={() => setTourOpen(true)} aria-label="Tutorial">
            <HelpCircle className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Tutorial</span>
          </Button>
          {cf.tenant && (
            <Button variant="outline" size="sm" onClick={() => setShowSettings(true)} aria-label="Configuración">
              <Settings className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Ajustes</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => signOut()} aria-label="Salir">
            <LogOut className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Salir</span>
          </Button>
        </div>
      </header>
      )}

      <WelcomeTour open={tourOpen} onClose={closeTour} />
      {showSettings && cf.tenant && (
        <TenantSettings tenant={cf.tenant} onSave={cf.updateSettings} onClose={() => setShowSettings(false)} />
      )}

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {cf.tenant?.is_demo && <DecisionJourney active={1} />}
        {cf.error && (
          <p role="alert" className="mb-6 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            {cf.error}
          </p>
        )}

        {cf.loading ? (
          <DashboardSkeleton />
        ) : !hasAccounts && canManage ? (
          <div className="py-10">
            <AccountSetup onCreate={cf.addAccount} />
          </div>
        ) : (
          <>
            {cf.tenant?.is_demo && (cf.tenant.business_model==='startup-saas'?<StartupFinancialStory cash={kpis.currentCash} fixedIncome={fixedIncome} fixedCosts={fixedCosts} lowest={kpis.lowestBalance}/>:<DemoFinancialStory cash={kpis.currentCash} receivables={pendingReceivables} payables={pendingPayables} lowest={kpis.lowestBalance} overdue={overdue.length}/>)}
            <div className="mb-8">
              <h1 className="font-display text-3xl font-bold tracking-tight">
                Hola{user?.user_metadata?.full_name ? `, ${String(user.user_metadata.full_name).split(' ')[0]}` : ''}
              </h1>
              <p className="mt-1 text-muted-foreground">{cf.tenant?.name ?? 'Tu empresa'} · flujo de caja en tiempo real</p>
            </div>

            <OperationsNav />

            {/* KPIs */}
            <div id="financial-kpis" className="scroll-mt-40 mt-8">
              <SectionIntro title="Resumen operativo" description="La posición actual antes de registrar nuevos cambios." />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Kpi label="Caja actual" value={formatCLP(kpis.currentCash)} icon={<Wallet className="size-4" />} tone={kpis.currentCash >= 0 ? 'text-primary' : 'text-danger'} />
              <Kpi label="Burn mensual" value={kpis.monthlyBurn > 0 ? `${formatCLP(kpis.monthlyBurn)}/mes` : 'Sin quema'} icon={<Flame className="size-4" />} tone={kpis.monthlyBurn > 0 ? 'text-danger' : 'text-primary'} />
              <Kpi label="Runway" value={runwayLabel} icon={<Timer className="size-4" />} tone={kpis.runwayMonths !== null && kpis.runwayMonths < 3 ? 'text-danger' : 'text-foreground'} />
              <Kpi label="Saldo mínimo proyectado" value={formatCLP(kpis.lowestBalance)} sub={kpis.lowestDate ?? undefined} icon={<TrendingDown className="size-4" />} tone={kpis.lowestBalance < 0 ? 'text-danger' : 'text-foreground'} />
                <RestrictedCashKpi tenantId={cf.tenant?.id ?? null} heuristicValue={restricted} taxRate={taxRate} />
              </div>
            </div>

            {/* Simulador activo */}
            {simActive && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2.5 text-sm">
                <span className="text-accent">Simulación activa — {ignored.size} evento{ignored.size === 1 ? '' : 's'} oculto{ignored.size === 1 ? '' : 's'} de la proyección.</span>
                <button onClick={() => setIgnored(new Set())} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted cursor-pointer">
                  <RotateCcw className="size-3.5" aria-hidden="true" /> Restablecer
                </button>
              </div>
            )}

            {/* Gráfico + cuentas */}
            <div id="cash-projection" className="scroll-mt-40 mt-8">
              <SectionIntro title="Proyección y cuentas" description="Anticipa el punto más bajo y confirma dónde está la caja." />
              <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
              <CashflowChart
                data={chartData}
                granularity={granularity}
                onGranularityChange={setGranularity}
                lowest={kpis.lowestDate ? { date: kpis.lowestDate, balance: kpis.lowestBalance } : null}
                simulatedData={simChartData}
              />
                <AccountsCard accounts={cf.accounts} onAdd={cf.addAccount} onEdit={cf.editAccount} onRemove={cf.removeAccount} canManage={canManage} />
              </div>
            </div>

            <div id="collections" className="scroll-mt-40 mt-8">
              <SectionIntro title="Cobranza y compromisos fijos" description="Resuelve vencimientos y mantén actualizados los movimientos recurrentes." />
            {overdue.length > 0 && (
              <div id="overdue-invoices" className="scroll-mt-24 mt-8">
                <ResolutionCenter overdue={overdue} onResolve={resolveOverdue} canOperate={canOperate} />
              </div>
            )}

            {workingCapitalAlert && (
              <div className="mt-8 rounded-lg border border-accent/50 bg-accent/10 px-4 py-3 text-sm">
                <p className="flex items-start gap-2 text-accent">
                  <Target className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    <strong>Capital de trabajo:</strong> adjudicarte estas licitaciones requiere financiar la ejecución antes del pago estatal —
                    tu caja proyectada cae a <strong>{formatCLP(workingCapitalAlert.balance)}</strong> el {workingCapitalAlert.date}, antes de recibir el ingreso.
                  </span>
                </p>
              </div>
            )}

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <RecurringPanel items={cf.recurringTransactions} onAdd={addRecurring} onRemove={removeRecurring} ignoredIds={ignored} onToggleIgnore={toggleIgnore} canManage={canFinancialWrite} />
              {canOperate ? <BidsPanel items={bids} onAdd={addBid} onRemove={removeBid} onToggleActive={toggleBid} /> : <RestrictedAction message="Tu rol permite consultar oportunidades, pero no modificar simulaciones." />}
            </div>

            {canOperate && <div className="mt-8">
              <ChileCompraPanel onSimulate={addBid} />
            </div>}
            </div>

            <div id="quick-entry" className="scroll-mt-40 mt-8">
              <SectionIntro title="Registro rápido" description="Agrega una factura o movimiento sin salir del centro operativo." />
              {canOperate ? <div className="grid gap-6 lg:grid-cols-2">
              <InvoiceForm onSubmit={addInvoice} onParse={cf.parsePdf} pdfUsed={cf.pdfUsed} pdfLimit={cf.pdfLimit} />
              <MovementForm accounts={cf.accounts} onSubmit={addTransaction} />
              </div> : <RestrictedAction message="Tu rol permite consultar la caja, pero no registrar operaciones. Solicita acceso de Finanzas u Operaciones al administrador." />}
            </div>

            {canManage && <div id="data-import" className="scroll-mt-40 mt-8">
              <SectionIntro title="Importación masiva" description="Actualiza varios movimientos desde un archivo CSV validado." />
              <CsvTransactionImporter accounts={cf.accounts} onImported={cf.refresh} />
            </div>}

            <div id="history" className="scroll-mt-40 mt-8">
              <SectionIntro title="Historial y correcciones" description="Consulta facturas y movimientos registrados y corrige solo cuando sea necesario." />
              <div className="grid gap-6 lg:grid-cols-2">
              <InvoicesList invoices={cf.invoices} onResolve={cf.resolveInvoice} onDelete={cf.removeInvoice} ignoredIds={ignored} onToggleIgnore={toggleIgnore} canOperate={canOperate} canDelete={canManage} />
              <MovementsList transactions={cf.transactions} onDelete={cf.removeTransaction} canDelete={canManage} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

const OPERATION_SECTIONS = [
  { href: '#financial-kpis', label: 'Resumen', icon: BarChart3 },
  { href: '#cash-projection', label: 'Proyección', icon: TrendingDown },
  { href: '#collections', label: 'Cobranza y fijos', icon: Repeat2 },
  { href: '#quick-entry', label: 'Registrar', icon: FilePlus2 },
  { href: '#data-import', label: 'Importar', icon: Upload },
  { href: '#history', label: 'Historial', icon: List },
];

function OperationsNav() {
  return (
    <nav aria-label="Secciones de operaciones" className="sticky top-16 z-20 rounded-xl border border-border bg-background/95 p-2 shadow-sm backdrop-blur">
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6">
        {OPERATION_SECTIONS.map(({ href, label, icon: Icon }) => (
          <a key={href} href={href} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-2 text-center text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:text-sm">
            <Icon className="size-4 shrink-0" aria-hidden="true" /> {label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function SectionIntro({ title, description }: { title: string; description: string }) {
  return <div className="mb-3"><h2 className="text-lg font-semibold">{title}</h2><p className="text-sm text-muted-foreground">{description}</p></div>;
}

function RestrictedAction({ message }: { message: string }) {
  return <div className="flex min-h-32 items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-5"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="size-5" aria-hidden="true" /></span><div><p className="text-sm font-semibold">Vista protegida por rol</p><p className="mt-1 max-w-2xl text-sm text-muted-foreground">{message}</p></div></div>;
}

function DashboardSkeleton() {
  const sk = 'animate-pulse rounded-xl border border-border bg-card/40';
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Cargando">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className={`${sk} h-24`} />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className={`${sk} h-80`} />
        <div className={`${sk} h-80`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className={`${sk} h-56`} />
        <div className={`${sk} h-56`} />
      </div>
    </div>
  );
}
