import { Link } from 'react-router-dom';
import { BellRing, Check, ClipboardCheck, DatabaseZap } from 'lucide-react';

const steps = [
  { to: '/data-quality', label: '1. Verificar datos', icon: DatabaseZap },
  { to: '/alerts', label: '2. Resolver alertas', icon: BellRing },
  { to: '/weekly-close', label: '3. Registrar cierre', icon: ClipboardCheck },
];

export function FinancialControlFlow({ current }: { current: 'alerts' | 'close' }) {
  const currentIndex = current === 'alerts' ? 1 : 2;
  return <aside aria-label="Flujo de control semanal" className="border-b border-border bg-muted/20"><div className="mx-auto grid max-w-6xl gap-2 px-4 py-3 sm:grid-cols-3 sm:px-6">{steps.map(({ to, label, icon: Icon }, index) => <Link key={to} to={to} aria-current={index === currentIndex ? 'step' : undefined} className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${index === currentIndex ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>{index < currentIndex ? <Check className="size-4" aria-hidden="true" /> : <Icon className="size-4" aria-hidden="true" />}{label}</Link>)}</div></aside>;
}
