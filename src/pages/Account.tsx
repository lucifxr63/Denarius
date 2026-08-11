import { useEffect, useState } from 'react';
import { Building2, CircleUserRound, Globe2, KeyRound, Palette, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/store/auth';
import { getDefaultTenant, getDenariusAccessContext, type Tenant } from '@/lib/queries';

export function Account() {
  const user = useAuth((state) => state.user);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isAdmin,setIsAdmin]=useState(false);
  useEffect(() => { getDefaultTenant().then(async current=>{setTenant(current);setIsAdmin(Boolean(current&&(await getDenariusAccessContext(current.id)).role==='platform_admin'))}).catch(() => {setTenant(null);setIsAdmin(false)}); }, []);
  const name = String(user?.user_metadata?.full_name || user?.user_metadata?.name || 'Usuario Denarius');
  const card = 'scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-6';
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">Cuenta y configuración</h1>
      <p className="mt-2 text-muted-foreground">Revisa tu identidad y las preferencias de este espacio Denarius.</p>
      <div className="mt-8 grid gap-6">
        <section id="profile" className={card} aria-labelledby="profile-title">
          <div className="flex items-center gap-3"><CircleUserRound className="size-6 text-primary" aria-hidden="true" /><h2 id="profile-title" className="text-lg font-semibold">Perfil</h2></div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" value={name} /><Field label="Correo" value={user?.email ?? 'No disponible'} />
          </dl>
          <p className="mt-4 text-sm text-muted-foreground">La identidad se administra con Google y puede ser compartida por otros productos Scouttech. Denarius no modifica este perfil.</p>
        </section>
        <section id="settings" className={card} aria-labelledby="settings-title">
          <div className="flex items-center gap-3"><Building2 className="size-6 text-primary" aria-hidden="true" /><h2 id="settings-title" className="text-lg font-semibold">Configuración de empresa</h2></div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Empresa" value={tenant?.name ?? 'Cargando…'} /><Field label="Modelo" value={tenant?.business_model === 'startup-saas' ? 'Startup SaaS' : tenant?.business_model === 'pyme-tradicional' ? 'PyME tradicional' : 'Por definir'} />
            <Field label="País y moneda" value={`${tenant?.country_code ?? 'CL'} · ${tenant?.base_currency ?? 'CLP'}`} icon={<Globe2 className="size-4" />} /><Field label="Zona horaria" value={tenant?.timezone ?? 'America/Santiago'} />
          </dl>
          <p className="mt-4 text-sm text-muted-foreground">El modelo financiero está protegido porque cambia métricas y fuentes. Los cambios administrativos se realizan de forma controlada.</p>
        </section>
        <section className={card} aria-labelledby="preferences-title">
          <div className="flex items-center gap-3"><Palette className="size-6 text-primary" aria-hidden="true" /><h2 id="preferences-title" className="text-lg font-semibold">Preferencias y seguridad</h2></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="flex min-h-14 items-center justify-between rounded-xl border border-border px-4"><span className="text-sm font-medium">Tema visual</span><ThemeToggle /></div>
            <Link to="/connections" className="flex min-h-14 items-center gap-3 rounded-xl border border-border px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"><KeyRound className="size-4 text-primary" />Conexiones MCP</Link>
            <Link to="/privacy" className="flex min-h-14 items-center gap-3 rounded-xl border border-border px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"><ShieldCheck className="size-4 text-primary" />Privacidad</Link>
            {isAdmin && <Link to="/admin/demo" className="flex min-h-14 items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"><Building2 className="size-4" />Abrir empresa demo</Link>}
          </div>
        </section>
      </div>
    </main>
  );
}
function Field({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) { return <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 flex items-center gap-2 break-words text-sm font-medium">{icon}{value}</dd></div>; }
