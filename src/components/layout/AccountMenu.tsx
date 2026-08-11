import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Building2, ChevronDown, LogOut, Settings, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/store/auth';
import { signOut } from '@/lib/auth';
import { getDefaultTenant, getDenariusAccessContext } from '@/lib/queries';

export function AccountMenu() {
  const user = useAuth((state) => state.user);
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [busy, setBusy] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const name = String(user?.user_metadata?.full_name || user?.user_metadata?.name || 'Mi cuenta');
  const initial = name.trim().charAt(0).toUpperCase() || 'U';

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (menuRef.current?.open && !menuRef.current.contains(event.target as Node)) menuRef.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menuRef.current?.open) {
        menuRef.current.open = false;
        menuRef.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, []);

  useEffect(() => { void getDefaultTenant().then(async tenant => setIsAdmin(Boolean(tenant && (await getDenariusAccessContext(tenant.id)).role === 'platform_admin'))).catch(() => setIsAdmin(false)); }, [user?.id]);

  async function logout() {
    setBusy(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No pudimos cerrar la sesión.');
      setBusy(false);
    }
  }

  const item = 'flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60';
  return (
    <details ref={menuRef} className="group relative">
      <summary aria-label="Abrir menú de usuario" className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg border border-border px-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 [&::-webkit-details-marker]:hidden">
        <span className="grid size-7 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary" aria-hidden="true">{initial}</span>
        <span className="hidden max-w-28 truncate text-sm font-medium xl:inline">{name}</span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="absolute right-0 z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-border bg-card p-2 shadow-xl">
        <div className="border-b border-border px-3 py-2">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <nav aria-label="Cuenta de usuario" className="mt-2 grid gap-1">
          <Link className={item} to="/account#profile" onClick={() => { if (menuRef.current) menuRef.current.open = false; }}><UserRound className="size-4" aria-hidden="true" />Perfil</Link>
          <Link className={item} to="/account#settings" onClick={() => { if (menuRef.current) menuRef.current.open = false; }}><Settings className="size-4" aria-hidden="true" />Configuración</Link>
          {isAdmin && <Link className={`${item} font-semibold text-primary`} to="/admin/demo" onClick={() => { if (menuRef.current) menuRef.current.open = false; }}><Building2 className="size-4" aria-hidden="true" />Demo administrativa</Link>}
          {isAdmin && <Link className={`${item} font-semibold text-primary`} to="/admin/experience" onClick={() => { if (menuRef.current) menuRef.current.open = false; }}><Activity className="size-4" aria-hidden="true" />Experiencia beta</Link>}
          <button className={`${item} text-danger`} type="button" disabled={busy} onClick={logout}><LogOut className="size-4" aria-hidden="true" />{busy ? 'Cerrando sesión…' : 'Cerrar sesión'}</button>
        </nav>
      </div>
    </details>
  );
}
