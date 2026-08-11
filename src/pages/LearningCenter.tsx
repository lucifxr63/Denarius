import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2, CirclePlay, HelpCircle, RotateCcw, ShieldCheck } from 'lucide-react';

const paths = [
  { title: 'Dueño o gerente de PyME', description: 'Anticipa faltantes, prioriza cobranza y cierra la semana con responsables claros.', steps: ['Lee la caja y el punto más bajo', 'Revisa cobros y pagos críticos', 'Convierte alertas en acciones', 'Completa el cierre semanal'], href: '/demo/pyme', cta: 'Practicar con Comercial Andes' },
  { title: 'Founder o CEO de Startup', description: 'Entiende MRR, burn, runway y unit economics antes de decidir contratación o crecimiento.', steps: ['Comprueba MRR y caja', 'Contrasta burn y runway', 'Revisa clientes y renovaciones', 'Cierra decisiones de crecimiento'], href: '/demo/startup', cta: 'Practicar con Nébula SaaS' },
];

export function LearningCenter() {
  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
    <header className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 via-card to-card p-6 sm:p-9">
      <p className="flex items-center gap-2 text-sm font-semibold text-primary"><BookOpen className="size-4" aria-hidden="true" />Centro de aprendizaje · Beta cerrada</p>
      <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold tracking-tight sm:text-4xl">Aprende Denarius tomando una decisión, no leyendo un manual.</h1>
      <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Cada recorrido usa datos ficticios y te guía por el mismo ciclo: entender, priorizar, actuar y medir. Puedes repetirlo o salir en cualquier momento.</p>
    </header>
    <section aria-labelledby="learning-paths" className="mt-8"><h2 id="learning-paths" className="text-xl font-bold">Elige tu recorrido</h2><div className="mt-4 grid gap-6 lg:grid-cols-2">
      {paths.map(path => <article key={path.href} className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><CirclePlay className="size-7 text-primary" aria-hidden="true" /><h3 className="mt-4 text-xl font-bold">{path.title}</h3><p className="mt-2 leading-6 text-muted-foreground">{path.description}</p><ol className="mt-5 grid gap-3">{path.steps.map((step,index)=><li key={step} className="flex gap-3 text-sm"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/15 font-semibold text-primary">{index+1}</span><span className="pt-1">{step}</span></li>)}</ol><Link to={path.href} className="mt-6 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">{path.cta}<ArrowRight className="size-4" aria-hidden="true" /></Link></article>)}
    </div></section>
    <section className="mt-8 grid gap-4 md:grid-cols-3"><Info icon={ShieldCheck} title="Entorno seguro" text="Cada invitado recibe su propia copia. Nunca ve la empresa ni los datos de quien compartió el enlace." /><Info icon={RotateCcw} title="Siempre repetible" text="La demo se puede reiniciar para volver al relato original después de experimentar." /><Info icon={HelpCircle} title="Acompañamiento beta" text="Si algo no se entiende, abre Soporte beta y cuéntanos en qué pantalla ocurrió." /></section>
  </main>;
}
function Info({icon:Icon,title,text}:{icon:typeof CheckCircle2;title:string;text:string}){return <article className="rounded-2xl border border-border bg-card p-5"><Icon className="size-6 text-primary" aria-hidden="true"/><h2 className="mt-3 font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></article>}
