import {
  Wallet,
  Landmark,
  Scale,
  TrendingDown,
  FileClock,
  Flame,
  Timer,
  Repeat,
  Activity,
  PiggyBank,
  CircleDollarSign,
  Gauge,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { WidgetMetric, MetricTone } from '@/hooks/useDashboardMetricsPayload';
import { WidgetTrendChart } from '@/components/dashboard/WidgetTrendChart';

// Widgets DUMMY (esqueletos vacíos por ahora). Son stateless: NO hacen fetch.
// Reciben su `title` desde el layout JSON y su `metric` inyectada por el
// DashboardCanvas. El registro al final mapea widgetId → componente.

export interface WidgetProps {
  title: string;
  /** Métrica ya resuelta; `undefined` mientras el payload carga. */
  metric?: WidgetMetric;
}

const TONE: Record<MetricTone, { value: string; tile: string }> = {
  positive: { value: 'text-primary', tile: 'bg-primary/15 text-primary' },
  negative: { value: 'text-danger', tile: 'bg-danger/15 text-danger' },
  warning: { value: 'text-amber', tile: 'bg-amber/15 text-amber' },
  neutral: { value: 'text-foreground', tile: 'bg-muted text-muted-foreground' },
};

function formatDelta(delta: number): string {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${(delta * 100).toFixed(1).replace('.', ',')}%`;
}

/** Tarjeta base reutilizada por todos los widgets de métrica simple. */
function MetricCard({ title, metric, icon: Icon }: WidgetProps & { icon: LucideIcon }) {
  const tone = TONE[metric?.tone ?? 'neutral'];
  return (
    <div className="h-full rounded-xl border border-border bg-card/60 p-5 backdrop-blur transition-colors hover:border-primary/30">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{title}</p>
        <span className={`grid size-8 place-items-center rounded-lg ${tone.tile}`}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      {metric ? (
        <>
          <p className={`mt-3 font-display text-2xl font-bold tracking-tight ${tone.value}`}>{metric.display}</p>
          <div className="mt-0.5 flex items-center gap-2">
            {metric.note && <p className="text-xs text-muted-foreground">{metric.note}</p>}
            {metric.delta !== undefined && (
              <span className={`text-xs font-medium ${metric.delta >= 0 ? 'text-primary' : 'text-danger'}`}>
                {formatDelta(metric.delta)}
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="mt-3 space-y-2" aria-busy="true">
          <div className="h-7 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted/70" />
        </div>
      )}
    </div>
  );
}

/** Tarjeta con placeholder de gráfico (sparkline a partir de `metric.trend`). */
function ChartCard({ title, metric, icon: Icon }: WidgetProps & { icon: LucideIcon }) {
  const tone = TONE[metric?.tone ?? 'neutral'];
  const trend = metric?.trend ?? [];
  return (
    <div className="h-full rounded-xl border border-border bg-card/60 p-5 backdrop-blur transition-colors hover:border-primary/30">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          {metric && <p className={`mt-1 font-display text-xl font-bold tracking-tight ${tone.value}`}>{metric.display}</p>}
        </div>
        <span className={`grid size-8 place-items-center rounded-lg ${tone.tile}`}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      {metric && trend.length > 0 ? (
        <div className="mt-4 h-24" role="img" aria-label={`Tendencia: ${title}`}>
          <WidgetTrendChart series={trend} tone={metric.tone} />
        </div>
      ) : (
        <div className="mt-4 h-24 animate-pulse rounded-lg bg-muted" aria-busy="true" />
      )}
      {metric?.note && <p className="mt-2 text-xs text-muted-foreground">{metric.note}</p>}
    </div>
  );
}

// ── Widgets nombrados (PyME) ────────────────────────────────────────────────
export const CurrentCashWidget = (p: WidgetProps) => <MetricCard {...p} icon={Wallet} />;
export const RestrictedCashWidget = (p: WidgetProps) => <MetricCard {...p} icon={Landmark} />;
export const WorkingCapitalWidget = (p: WidgetProps) => <MetricCard {...p} icon={Scale} />;
export const LiquidityProjectionWidget = (p: WidgetProps) => <ChartCard {...p} icon={TrendingDown} />;
export const ReceivablesWidget = (p: WidgetProps) => <MetricCard {...p} icon={FileClock} />;

// ── Widgets nombrados (Startup SaaS) ────────────────────────────────────────
export const BurnRateWidget = (p: WidgetProps) => <MetricCard {...p} icon={Flame} />;
export const GrossBurnWidget = (p: WidgetProps) => <MetricCard {...p} icon={CircleDollarSign} />;
export const RunwayWidget = (p: WidgetProps) => <MetricCard {...p} icon={Timer} />;
export const MrrWidget = (p: WidgetProps) => <MetricCard {...p} icon={Repeat} />;
export const MrrGrowthWidget = (p: WidgetProps) => <MetricCard {...p} icon={TrendingUp} />;
export const BurnMultipleWidget = (p: WidgetProps) => <MetricCard {...p} icon={Gauge} />;
export const BurnTrendWidget = (p: WidgetProps) => <ChartCard {...p} icon={Activity} />;
export const CashBalanceWidget = (p: WidgetProps) => <MetricCard {...p} icon={PiggyBank} />;
export const NewMrrWidget = (p: WidgetProps) => <MetricCard {...p} icon={TrendingUp} />;
export const ExpansionMrrWidget = (p: WidgetProps) => <MetricCard {...p} icon={Activity} />;
export const ChurnedMrrWidget = (p: WidgetProps) => <MetricCard {...p} icon={TrendingDown} />;
export const ChurnRateWidget = (p: WidgetProps) => <MetricCard {...p} icon={Gauge} />;
export const ActiveCustomersWidget = (p: WidgetProps) => <MetricCard {...p} icon={Repeat} />;
export const NrrWidget = (p: WidgetProps) => <MetricCard {...p} icon={TrendingUp} />;
export const GrrWidget = (p: WidgetProps) => <MetricCard {...p} icon={Gauge} />;
export const LogoChurnWidget = (p: WidgetProps) => <MetricCard {...p} icon={TrendingDown} />;
export const RetentionTrendWidget = (p: WidgetProps) => <ChartCard {...p} icon={Activity} />;
export const TopConcentrationWidget = (p: WidgetProps) => <MetricCard {...p} icon={Gauge} />;
export const AtRiskMrrWidget = (p: WidgetProps) => <MetricCard {...p} icon={TrendingDown} />;
export const AtRiskCustomersWidget = (p: WidgetProps) => <MetricCard {...p} icon={FileClock} />;
export const OverdueRenewalsWidget = (p: WidgetProps) => <MetricCard {...p} icon={FileClock} />;
export const UpcomingRenewalsWidget = (p: WidgetProps) => <MetricCard {...p} icon={Timer} />;
export const RenewalMrrWidget = (p: WidgetProps) => <MetricCard {...p} icon={Repeat} />;

// Registro: widgetId (del JSON) → componente. El DashboardCanvas resuelve aquí.
export const WIDGET_REGISTRY: Record<string, (p: WidgetProps) => React.ReactElement> = {
  currentCashWidget: CurrentCashWidget,
  restrictedCashWidget: RestrictedCashWidget,
  workingCapitalWidget: WorkingCapitalWidget,
  liquidityProjectionWidget: LiquidityProjectionWidget,
  receivablesWidget: ReceivablesWidget,
  burnRateWidget: BurnRateWidget,
  grossBurnWidget: GrossBurnWidget,
  runwayWidget: RunwayWidget,
  mrrWidget: MrrWidget,
  mrrGrowthWidget: MrrGrowthWidget,
  burnMultipleWidget: BurnMultipleWidget,
  burnTrendWidget: BurnTrendWidget,
  cashBalanceWidget: CashBalanceWidget,
  newMrrWidget: NewMrrWidget,
  expansionMrrWidget: ExpansionMrrWidget,
  churnedMrrWidget: ChurnedMrrWidget,
  churnRateWidget: ChurnRateWidget,
  activeCustomersWidget: ActiveCustomersWidget,
  nrrWidget: NrrWidget,
  grrWidget: GrrWidget,
  logoChurnWidget: LogoChurnWidget,
  retentionTrendWidget: RetentionTrendWidget,
  topConcentrationWidget: TopConcentrationWidget,
  atRiskMrrWidget: AtRiskMrrWidget,
  atRiskCustomersWidget: AtRiskCustomersWidget,
  overdueRenewalsWidget: OverdueRenewalsWidget,
  upcomingRenewalsWidget: UpcomingRenewalsWidget,
  renewalMrrWidget: RenewalMrrWidget,
};
