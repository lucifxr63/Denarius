import { Link } from 'react-router-dom';
import {
  ArrowRight, Bot, Building2, Check, CircleDollarSign, Clock3, Gauge,
  KeyRound, LockKeyhole, MessageSquareText, Rocket, ShieldCheck, Sparkles,
  TrendingDown, Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';

const capabilities = [
  { icon: Wallet, title: 'Caja disponible', text: 'Separa saldo total, caja restringida y dinero realmente utilizable.' },
  { icon: Gauge, title: 'Burn y runway', text: 'Entiende cuánto consumes por mes y cuánto tiempo puede operar tu empresa.' },
  { icon: Clock3, title: 'Proyección 30–365 días', text: 'Anticipa el punto mínimo de caja usando facturas y recurrencias.' },
  { icon: TrendingDown, title: 'Cobranza vencida', text: 'Identifica cuentas por cobrar atrasadas y prioriza seguimiento.' },
  { icon: MessageSquareText, title: 'Métricas explicables', text: 'Consulta valores, fórmulas, fecha de corte y fuentes utilizadas.' },
  { icon: Sparkles, title: 'Escenarios sin riesgo', text: 'Simula atrasos de cobro sin alterar la información financiera real.' },
];

const tools = [
  'get_cash_position', 'get_runway_and_burn', 'list_overdue_invoices',
  'get_cash_projection', 'get_restricted_cash', 'explain_metric',
  'get_financial_summary', 'explain_projection_point', 'simulate_scenario',
];

const phases = [
  { state: 'Disponible', title: 'Denarius financiero', text: 'Dashboard adaptable, caja, facturas, recurrencias, proyecciones y métricas para PyMEs y startups.' },
  { state: 'Beta privada', title: 'MCP para Claude y Desktop', text: 'Consulta 14 herramientas y, con permiso explícito, crea o actualiza acciones mediante OAuth o una API key individual y revocable.' },
  { state: 'Próximo', title: 'Distribución npm', text: 'Instalación certificada para Claude Desktop, Cursor y otros clientes compatibles.' },
  { state: 'Futuro', title: 'MCP Cloud y acciones', text: 'OAuth neutral por producto y operaciones confirmadas, idempotentes y auditables.' },
];

const glowButton = 'rounded-full shadow-[0_0_22px_color-mix(in_oklab,var(--color-primary)_32%,transparent)] hover:shadow-[0_0_30px_color-mix(in_oklab,var(--color-primary)_48%,transparent)]';
const focusLink = 'rounded-md transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-4 focus-visible:ring-offset-background';

export function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="fixed inset-x-3 top-3 z-50 mx-auto flex max-w-6xl items-center justify-between rounded-full border border-border bg-card/90 px-4 py-2.5 shadow-xl backdrop-blur-xl sm:inset-x-5 sm:px-5">
        <a href="#inicio" className={`flex items-center gap-2.5 font-semibold ${focusLink}`} aria-label="Denarius, inicio">
          <span className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary"><Wallet className="size-5" aria-hidden="true" /></span>
          <span className="font-display text-lg font-bold sm:text-xl">Denarius</span>
        </a>
        <nav className="hidden items-center gap-5 text-sm text-muted-foreground lg:flex" aria-label="Navegación principal">
          <a href="#producto" className={focusLink}>Producto</a>
          <a href="#mcp" className={focusLink}>MCP</a>
          <a href="#seguridad" className={focusLink}>Seguridad</a>
          <a href="#roadmap" className={focusLink}>Roadmap</a>
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle className="rounded-full" />
          <Link to="/login" className="hidden sm:block"><Button size="sm" variant="ghost">Iniciar sesión</Button></Link>
          <Link to="/login"><Button size="sm" className={glowButton}>Probar Denarius</Button></Link>
        </div>
      </header>

      <main>
        <section id="inicio" className="relative px-4 pb-20 pt-36 sm:px-6 sm:pt-44">
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-12 -z-10 h-[38rem] w-[48rem] max-w-[95vw] -translate-x-1/2 rounded-full bg-primary/15 blur-[140px]" />
          <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.06fr_.94fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"><Bot className="size-4" aria-hidden="true" /> Inteligencia financiera conectada por MCP</span>
              <h1 className="mt-7 text-balance font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">Tu caja deja de ser una planilla y empieza a <span className="text-primary">responderte.</span></h1>
              <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">Denarius reúne caja, facturas, recurrencias y proyecciones. Su MCP permite consultar esa misma fuente desde un asistente, con acceso read-only, aislamiento por empresa y trazabilidad.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to="/login"><Button size="lg" className={`w-full sm:w-auto ${glowButton}`}>Comenzar gratis <ArrowRight className="size-4" aria-hidden="true" /></Button></Link>
                <a href="#mcp"><Button size="lg" variant="outline" className="w-full rounded-full sm:w-auto">Conocer el MCP <Bot className="size-4" aria-hidden="true" /></Button></a>
              </div>
              <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {['Sin tarjeta', 'Datos reales', 'MCP read-only'].map(item => <li key={item} className="flex items-center gap-1.5"><Check className="size-4 text-primary" aria-hidden="true" />{item}</li>)}
              </ul>
            </div>

            <div className="relative" aria-label="Vista resumida de Denarius">
              <div className="rounded-3xl border border-border bg-card/90 p-5 shadow-2xl backdrop-blur sm:p-7">
                <div className="flex items-start justify-between gap-4 border-b border-border pb-5"><div><p className="text-sm text-muted-foreground">Caja disponible hoy</p><p className="mt-1 font-display text-4xl font-bold">$4.820.000</p></div><span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Datos al día</span></div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2"><Metric label="Runway" value="8,4 meses" note="Burn neto" /><Metric label="Caja restringida" value="$820.000" note="Reserva estimada" /></div>
                <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/5 p-4"><div className="flex items-center gap-2 text-sm font-semibold"><Bot className="size-4 text-primary" aria-hidden="true" /> Pregunta desde tu asistente</div><p className="mt-3 text-sm text-muted-foreground">“¿Me quedaré sin caja en los próximos 90 días?”</p><div className="mt-3 rounded-xl border border-border bg-background/80 p-3 text-sm leading-6">Tu punto mínimo proyectado es <strong>$2.140.000</strong> el 18 de septiembre. La principal salida es una cuenta por pagar de $1.200.000.</div></div>
              </div>
            </div>
          </div>
        </section>

        <section id="producto" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <SectionIntro eyebrow="Una fuente de verdad" title="Decisiones financieras que puedes verificar" text="La web y el MCP consumen los mismos cálculos. Cada respuesta conserva empresa, moneda, fecha de corte y fuentes." />
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{capabilities.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-border bg-card p-6 transition-colors duration-200 hover:border-primary/35"><span className="grid size-11 place-items-center rounded-xl bg-primary/12 text-primary"><Icon className="size-5" aria-hidden="true" /></span><h3 className="mt-5 font-display text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></article>)}</div>
          <div className="mt-5 grid gap-5 md:grid-cols-2"><ModelCard icon={Building2} title="PyME tradicional" text="Liquidez, capital de trabajo, caja tributaria, facturas y obligaciones próximas." /><ModelCard icon={Rocket} title="Startup SaaS" text="Burn, runway, MRR, retención, riesgo de clientes y renovaciones." /></div>
        </section>

        <section id="mcp" className="border-y border-border bg-card/40 px-4 py-24 sm:px-6">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.8fr_1.2fr]">
            <div><SectionIntro eyebrow="Model Context Protocol" title="Tus números, disponibles donde trabajas" text="El MCP de Denarius traduce preguntas en herramientas financieras estructuradas. La versión desktop está en beta privada antes de su publicación en npm." /><div className="mt-7 inline-flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-medium text-primary"><KeyRound className="size-4" aria-hidden="true" /> API keys individuales y revocables</div></div>
            <div className="rounded-3xl border border-border bg-background p-5 shadow-xl sm:p-7"><div className="grid gap-3 sm:grid-cols-3"><FlowStep number="01" title="Pregunta" text="Claude, Cursor u otro cliente MCP" /><FlowStep number="02" title="Herramienta" text="Denarius valida clave, usuario y empresa" /><FlowStep number="03" title="Respuesta" text="Datos estructurados, fuentes y auditoría" /></div><div className="mt-6 flex flex-wrap gap-2">{tools.map(tool => <code key={tool} className="rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">{tool}</code>)}</div></div>
          </div>
        </section>

        <section id="seguridad" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <SectionIntro eyebrow="Seguridad por diseño" title="El asistente no elige a qué empresa acceder" text="La identidad y el tenant se resuelven en el servidor. El cliente sólo recibe las herramientas autorizadas." />
          <div className="mt-12 grid gap-5 md:grid-cols-3"><SecurityCard icon={LockKeyhole} title="Secreto visible una vez" text="La base conserva un hash SHA-256, nunca la API key en texto plano." /><SecurityCard icon={ShieldCheck} title="Read-only verificable" text="Scope financial:read, esquemas cerrados y simulaciones que no persisten." /><SecurityCard icon={CircleDollarSign} title="Sin operaciones bancarias" text="No realiza pagos, transferencias, impuestos, borrados ni cambios de permisos." /></div>
        </section>

        <section id="roadmap" className="px-4 py-24 sm:px-6">
          <div className="mx-auto max-w-6xl rounded-3xl border border-border bg-gradient-to-br from-primary/12 via-card to-accent/10 p-6 sm:p-10 lg:p-12"><SectionIntro eyebrow="Dirección del producto" title="Avanzamos sin confundir futuro con presente" text="Primero datos confiables y consultas seguras. Después distribución, cloud y acciones confirmadas." /><div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{phases.map((phase, index) => <article key={phase.title} className="rounded-2xl border border-border bg-background/75 p-5"><div className="flex items-center justify-between"><span className="font-mono text-xs text-muted-foreground">0{index + 1}</span><span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{phase.state}</span></div><h3 className="mt-5 font-semibold">{phase.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{phase.text}</p></article>)}</div></div>
        </section>

        <section className="px-4 py-24 text-center sm:px-6"><div className="mx-auto max-w-3xl"><Bot className="mx-auto size-9 text-primary" aria-hidden="true" /><h2 className="mt-5 text-balance font-display text-4xl font-bold sm:text-5xl">Empieza por entender tu caja</h2><p className="mx-auto mt-4 max-w-xl text-lg leading-7 text-muted-foreground">Crea tu empresa, carga tus datos y obtén una proyección financiera. La conexión MCP se administra desde tu cuenta.</p><Link to="/login" className="mt-8 inline-block"><Button size="lg" className={`text-base ${glowButton}`}>Probar Denarius <ArrowRight className="size-5" aria-hidden="true" /></Button></Link></div></section>
      </main>

      <footer className="border-t border-border px-4 py-10 sm:px-6"><div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row"><span className="flex items-center gap-2 font-display font-bold text-foreground"><Wallet className="size-4 text-primary" aria-hidden="true" /> Denarius</span><p>© {new Date().getFullYear()} Scout Tech. Producto financiero en evolución.</p><div className="flex gap-5"><a href="#seguridad" className={focusLink}>Seguridad</a><Link to="/login" className={focusLink}>Acceder</Link></div></div></footer>
    </div>
  );
}

function SectionIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) { return <div className="max-w-3xl"><p className="text-sm font-semibold uppercase tracking-[.18em] text-primary">{eyebrow}</p><h2 className="mt-3 text-balance font-display text-3xl font-bold tracking-tight sm:text-5xl">{title}</h2><p className="mt-4 text-lg leading-8 text-muted-foreground">{text}</p></div>; }
function Metric({ label, value, note }: { label: string; value: string; note: string }) { return <div className="rounded-2xl border border-border bg-background/70 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></div>; }
function ModelCard({ icon: Icon, title, text }: { icon: typeof Building2; title: string; text: string }) { return <article className="flex gap-4 rounded-2xl border border-border bg-card p-6"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent"><Icon className="size-5" aria-hidden="true" /></span><div><h3 className="font-display text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div></article>; }
function FlowStep({ number, title, text }: { number: string; title: string; text: string }) { return <div className="rounded-2xl border border-border bg-card p-4"><span className="font-mono text-xs text-primary">{number}</span><h3 className="mt-3 font-semibold">{title}</h3><p className="mt-1 text-sm leading-5 text-muted-foreground">{text}</p></div>; }
function SecurityCard({ icon: Icon, title, text }: { icon: typeof ShieldCheck; title: string; text: string }) { return <article className="rounded-2xl border border-border bg-card p-6"><Icon className="size-6 text-primary" aria-hidden="true" /><h3 className="mt-5 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></article>; }
