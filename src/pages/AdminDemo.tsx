// @ts-nocheck -- compact showcase; behavioral contracts cover the generated sandbox UI.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  LoaderCircle,
  LockKeyhole,
  RefreshCcw,
  TriangleAlert,
  Share2,
} from "lucide-react";
import {
  getDefaultTenant,
  getDenariusAccessContext,
  resetDenariusDemoPyme,
  resetDenariusDemoStartup,
} from "@/lib/queries";
import { toast } from "sonner";
const steps = [
  "Empresa PyME configurada",
  "Caja y movimientos cargados",
  "Cobros y pagos priorizados",
  "Cierre semanal registrado",
  "Plan de acción en seguimiento",
];
export function AdminDemo() {
  const [allowed, setAllowed] = useState<boolean | null>(null),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    getDefaultTenant()
      .then(async (t) =>
        setAllowed(
          Boolean(
            t &&
            (await getDenariusAccessContext(t.id)).role === "platform_admin",
          ),
        ),
      )
      .catch(() => setAllowed(false));
  }, []);
  async function prepare(model: "pyme" | "startup") {
    setSaving(true);
    try {
      await (model === "pyme" ? resetDenariusDemoPyme() : resetDenariusDemoStartup());
      toast.success(model === "pyme" ? "Sandbox PyME reiniciado" : "Sandbox Startup reiniciado");
      window.location.assign("/dashboard");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No se pudo preparar la demo.",
      );
      setSaving(false);
    }
  }
  async function share(model: "pyme" | "startup") {
    const url = `${window.location.origin}/demo/${model}`;
    try { await navigator.clipboard.writeText(url); toast.success("Enlace de demo copiado"); }
    catch { window.prompt("Copia este enlace", url); }
  }
  if (allowed === null)
    return (
      <div className="grid min-h-[50vh] place-items-center text-sm text-muted-foreground">
        Verificando acceso administrativo…
      </div>
    );
  if (!allowed)
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <LockKeyhole className="mx-auto size-8 text-danger" />
        <h1 className="mt-4 text-2xl font-bold">
          Acceso administrativo requerido
        </h1>
        <p className="mt-2 text-muted-foreground">
          Este sandbox no está disponible para usuarios normales.
        </p>
      </main>
    );
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <section className="rounded-3xl border border-primary/25 bg-primary/5 p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Eye className="size-4" />
              Sandbox administrativo · PyME
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold">
              Comercial Andes · Demo
            </h1>
            <p className="mt-2 max-w-2xl leading-6 text-muted-foreground">
              Una empresa ficticia, completamente editable, con caja, facturas,
              recurrencias, cierre y acciones listas para demostrar el producto.
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => void prepare("pyme")}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <RefreshCcw className="size-4" />
            )}
            {saving ? "Preparando…" : "Reiniciar y entrar"}
          </button>
          <button type="button" disabled={saving} onClick={()=>void prepare("startup")} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary/30 bg-background px-5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-wait disabled:opacity-60"><RefreshCcw className="size-4"/>Entrar a Startup</button>
        </div>
      </section>
      <section className="mt-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row">
        <button type="button" onClick={() => void share("pyme")} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-semibold hover:bg-muted"><Share2 className="size-4" />Compartir demo PyME</button>
        <button type="button" onClick={() => void share("startup")} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-semibold hover:bg-muted"><Share2 className="size-4" />Compartir demo Startup</button>
        <Link to="/learn" className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold text-primary hover:bg-primary/10">Ver tutoriales</Link>
      </section>
      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_.75fr]">
        <article className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Building2 className="size-7 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">
                Dueño o gerente de PyME
              </p>
              <h2 className="text-xl font-bold">Escenario preparado</h2>
            </div>
          </div>
          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-muted/40 p-4">
              <dt className="text-xs text-muted-foreground">Caja inicial</dt>
              <dd className="mt-1 text-lg font-semibold">$18.450.000</dd>
            </div>
            <div className="rounded-xl bg-muted/40 p-4">
              <dt className="text-xs text-muted-foreground">Por cobrar</dt>
              <dd className="mt-1 text-lg font-semibold">$6.200.000</dd>
            </div>
            <div className="rounded-xl bg-muted/40 p-4">
              <dt className="text-xs text-muted-foreground">
                Riesgo inmediato
              </dt>
              <dd className="mt-1 font-semibold">Factura vencida de $3,2M</dd>
            </div>
            <div className="rounded-xl bg-muted/40 p-4">
              <dt className="text-xs text-muted-foreground">Proceso</dt>
              <dd className="mt-1 font-semibold">
                Cierre y 3 acciones creadas
              </dd>
            </div>
          </dl>
        </article>
        <article className="rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:p-6"><div className="flex items-center gap-3"><Eye className="size-7 text-primary"/><div><p className="text-sm text-muted-foreground">Founder o CEO de Startup</p><h2 className="text-xl font-bold">Nébula SaaS · Demo</h2></div></div><dl className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-background/70 p-4"><dt className="text-xs text-muted-foreground">Caja inicial</dt><dd className="mt-1 text-lg font-semibold">$84.300.000</dd></div><div className="rounded-xl bg-background/70 p-4"><dt className="text-xs text-muted-foreground">MRR canónico</dt><dd className="mt-1 text-lg font-semibold">$13.100.000</dd></div><div className="rounded-xl bg-background/70 p-4"><dt className="text-xs text-muted-foreground">Decisión</dt><dd className="mt-1 font-semibold">Burn antes de contratar</dd></div><div className="rounded-xl bg-background/70 p-4"><dt className="text-xs text-muted-foreground">Proceso</dt><dd className="mt-1 font-semibold">Cierre y 3 acciones</dd></div></dl></article>
        <aside className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="size-5 text-primary" />
            <h2 className="font-semibold">Happy flow disponible</h2>
          </div>
          <ol className="mt-4 grid gap-3">
            {steps.map((label, i) => (
              <li key={label} className="flex items-center gap-3 text-sm">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                  <CheckCircle2 className="size-4" />
                </span>
                {label}
              </li>
            ))}
          </ol>
        </aside>
      </section>
      <section className="mt-6 flex flex-col gap-3 rounded-xl border border-amber/25 bg-amber/5 p-4 sm:flex-row sm:items-center">
        <TriangleAlert className="size-5 shrink-0 text-amber" />
        <p className="text-sm leading-6 text-muted-foreground">
          “Reiniciar” borra solamente tu tenant marcado como demo y lo vuelve a
          crear. Nunca modifica empresas reales ni usuarios compartidos con
          otros productos.
        </p>
        <Link
          to="/dashboard"
          className="sm:ml-auto inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-semibold hover:bg-muted"
        >
          Volver sin reiniciar
        </Link>
      </section>
    </main>
  );
}
