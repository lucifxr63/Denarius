import { useEffect, useRef, useState } from 'react';
import { Building2, Rocket, ChevronsUpDown, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDefaultTenant, getDenariusAccessContext, saveBusinessModelProfile } from '@/lib/queries';
import { toast } from 'sonner';
import { useWorkspaceStore, WORKSPACES, getWorkspaceMeta, type WorkspaceMeta } from '@/store/useWorkspaceStore';

// Workspace Switcher. Conmuta el modelo de negocio activo SIN modales: usa un
// patrón DropdownMenu (botón + popover) en el header. Conectado a
// useWorkspaceStore para reflejar y mutar el estado.
//
// Se construye autocontenido porque el proyecto no tiene el primitivo
// DropdownMenu de shadcn/ui instalado (solo Button y Confirm en src/components/ui).

const ICONS: Record<WorkspaceMeta['icon'], LucideIcon> = {
  building: Building2,
  rocket: Rocket,
};

export function WorkspaceSwitcher({ className }: { className?: string }) {
  const model = useWorkspaceStore((s) => s.model);
  const setModel = useWorkspaceStore((s) => s.setModel);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canChange, setCanChange] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const active = getWorkspaceMeta(model);
  const ActiveIcon = ICONS[active.icon];

  useEffect(()=>{void getDefaultTenant().then(async tenant=>{if(tenant)setCanChange((await getDenariusAccessContext(tenant.id)).can_change_business_model)}).catch(()=>setCanChange(false))},[]);

  // Cierra al hacer click fuera o con Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const select = async (next: WorkspaceMeta['id']) => {
    if (next === model) return setOpen(false);
    setSaving(true);
    try {
      const tenant = await getDefaultTenant();
      if (!tenant) throw new Error('No hay una empresa activa.');
      await saveBusinessModelProfile({ tenantId: tenant.id, model: next, source: 'manual' });
      setModel(next);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cambiar la vista.');
    } finally {
      setSaving(false);
    }
  };

  // La comprobación de permisos es asíncrona. Este retorno debe ocurrir después
  // de todos los hooks para conservar su orden cuando canChange pasa a true.
  if (!canChange) return <div className={cn('inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium', className)} title="El modelo pertenece a esta empresa"><ActiveIcon className="size-4 text-primary" aria-hidden="true" /><span className="hidden sm:inline">{active.label}</span><span className="sr-only">Modelo de empresa bloqueado</span></div>;

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Cambiar modelo de negocio"
        disabled={saving}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-transparent px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 cursor-pointer"
      >
        <span className="grid size-5 place-items-center rounded text-primary">
          <ActiveIcon className="size-4" aria-hidden="true" />
        </span>
        <span className="hidden sm:inline">{active.label}</span>
        <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Modelos de negocio"
          className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-xl"
        >
          {WORKSPACES.map((ws) => {
            const Icon = ICONS[ws.icon];
            const selected = ws.id === model;
            return (
              <button
                key={ws.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                disabled={saving}
                onClick={() => void select(ws.id)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer',
                  selected ? 'bg-primary/10' : 'hover:bg-muted',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg',
                    selected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {ws.label}
                    {selected && <Check className="size-3.5 text-primary" aria-hidden="true" />}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{ws.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
