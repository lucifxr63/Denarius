import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BellRing,
  Bot,
  ChevronDown,
  ClipboardCheck,
  DatabaseZap,
  LayoutDashboard,
  LifeBuoy,
  BookOpen,
  UsersRound,
  ListChecks,
  Repeat2,
  Wallet,
  Wrench,
  Eye,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { WorkspaceSwitcher } from '@/components/layout/WorkspaceSwitcher';
import { AccountMenu } from '@/components/layout/AccountMenu';
import { CompanySwitcher } from '@/components/layout/CompanySwitcher';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { getDefaultTenant, getDenariusAccessContext } from '@/lib/queries';

const primaryLinks = [
  { to: '/dashboard', label: 'Resumen', icon: LayoutDashboard },
  { to: '/operations', label: 'Operaciones', icon: Wrench },
  { to: '/alerts', label: 'Alertas', icon: BellRing },
  { to: '/weekly-close', label: 'Cierre', icon: ClipboardCheck },
];

function NavigationLink({ to, label, icon: Icon, compact = false }: (typeof primaryLinks)[number] & { compact?: boolean }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
          isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        } ${compact ? 'w-full' : ''}`
      }
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  );
}

export function ProductHeader({ actions }: { actions?: ReactNode }) {
  const model = useWorkspaceStore((state) => state.model);
  const location = useLocation();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [restricted,setRestricted]=useState<{role:string;name:string}|null>(null);
  const secondaryActive = ['/connections', '/subscriptions', '/data-quality', '/support', '/learn'].includes(location.pathname);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (menuRef.current?.open && !menuRef.current.contains(event.target as Node)) menuRef.current.open = false;
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menuRef.current?.open) {
        menuRef.current.open = false;
        menuRef.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);
  useEffect(()=>{void getDefaultTenant().then(async tenant=>{if(!tenant)return;const access=await getDenariusAccessContext(tenant.id);setRestricted(access.read_only?{role:access.role,name:tenant.name}:null)}).catch(()=>undefined)},[location.pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <NavLink
          to="/dashboard"
          aria-label="Ir al resumen de Denarius"
          className="flex shrink-0 items-center gap-2.5 rounded-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <span className="grid size-9 place-items-center rounded-lg bg-primary/15 text-primary">
            <Wallet className="size-5" aria-hidden="true" />
          </span>
          <span className="hidden font-display text-lg font-bold sm:inline">Denarius</span>
        </NavLink>

        <nav aria-label="Navegación principal" className="hidden items-center lg:flex">
          {primaryLinks.map((link) => <NavigationLink key={link.to} {...link} />)}
        </nav>

        <div className="ml-auto hidden md:block"><CompanySwitcher /></div>
        <div className="hidden md:block">
          <WorkspaceSwitcher />
        </div>
        <ThemeToggle />
        <AccountMenu />

        <details ref={menuRef} className="group relative">
          <summary className={`flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 [&::-webkit-details-marker]:hidden ${secondaryActive ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border'}`}>
            Más
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-border bg-card p-2 shadow-xl">
            <div className="mb-2 grid gap-2 md:hidden"><CompanySwitcher /><WorkspaceSwitcher className="w-full" /></div>
            <nav aria-label="Navegación móvil" className="grid lg:hidden">
              {primaryLinks.map((link) => <NavigationLink key={link.to} {...link} compact />)}
            </nav>
            <div className="my-2 border-t border-border" />
            <nav aria-label="Herramientas de Denarius" className="grid">
              <NavigationLink to="/connections" label="Conectar asistente" icon={Bot} compact />
              {model === 'startup-saas' && <NavigationLink to="/subscriptions" label="Suscripciones" icon={Repeat2} compact />}
              <NavigationLink to="/data-quality" label="Calidad de datos" icon={DatabaseZap} compact />
              <NavigationLink to="/action-plan" label="Plan de acción" icon={ListChecks} compact />
              <NavigationLink to="/support" label="Soporte beta" icon={LifeBuoy} compact />
              <NavigationLink to="/learn" label="Aprender Denarius" icon={BookOpen} compact />
              <NavigationLink to="/team" label="Equipo y permisos" icon={UsersRound} compact />
            </nav>
            {actions && <div className="mt-2 grid gap-1 border-t border-border pt-2">{actions}</div>}
          </div>
        </details>
      </div>
      {restricted&&<div className="border-t border-primary/20 bg-primary/5 px-4 py-2 text-center text-xs font-medium text-primary" role="status"><span className="inline-flex items-center gap-2"><Eye className="size-4" aria-hidden="true"/>Modo solo lectura · {restricted.name} · rol {restricted.role}. Las modificaciones están protegidas por permisos.</span></div>}
    </header>
  );
}
