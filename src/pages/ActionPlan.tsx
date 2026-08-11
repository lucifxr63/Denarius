import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  LoaderCircle,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { DecisionJourney } from "@/components/decision-story/DecisionJourney";
import {
  getDefaultTenant,
  getDenariusAccessContext,
  getFinancialActionPlan,
  updateFinancialActionDetails,
  updateFinancialActionStatus,
  type FinancialActionPlan,
} from "@/lib/queries";
const date = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }),
  money = new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  });
type Action = FinancialActionPlan["actions"][number];
export function ActionPlan() {
  const [data, setData] = useState<FinancialActionPlan | null>(null),
    [tenantId, setTenantId] = useState(""),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(""),
    [permissions, setPermissions] = useState<string[]>([]);
  async function load(id?: string) {
    const tenant = id ? { id } : await getDefaultTenant();
    if (!tenant) throw new Error("No encontramos una empresa activa.");
    setTenantId(tenant.id);
    const [plan, access] = await Promise.all([getFinancialActionPlan(tenant.id), getDenariusAccessContext(tenant.id)]);
    setData(plan);
    setPermissions(access.permissions);
  }
  useEffect(() => {
    void load()
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);
  async function status(id: string, next: Action["status"]) {
    setSaving(id);
    try {
      await updateFinancialActionStatus(id, next);
      await load(tenantId);
      toast.success("Acción actualizada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No pudimos actualizarla.");
    } finally {
      setSaving("");
    }
  }
  async function details(
    id: string,
    value: { assignee: string; dueDate: string; impact: number | null },
  ) {
    setSaving(id);
    try {
      await updateFinancialActionDetails({
        taskId: id,
        assignee: value.assignee,
        dueDate: value.dueDate,
        expectedCashImpact: value.impact,
      });
      await load(tenantId);
      toast.success("Responsable e impacto guardados");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No pudimos guardar los detalles.",
      );
    } finally {
      setSaving("");
    }
  }
  if (loading)
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <LoaderCircle className="size-5 animate-spin" />
      </div>
    );
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <DecisionJourney active={3} />
      <div className="flex gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/15 text-primary">
          <ClipboardList className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-primary">
            Ejecución financiera
          </p>
          <h1 className="font-display text-3xl font-bold">
            Plan de acción semanal
          </h1>
          <p className="mt-2 text-muted-foreground">
            Responsable, fecha, impacto esperado y avance derivados de cada
            cierre.
          </p>
        </div>
      </div>
      {data && (
        <>
          <section className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ["Pendientes", data.open_count],
              ["Vencidas", data.overdue_count],
              ["Completadas", data.done_count],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-xl border border-border bg-card p-4"
              >
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-bold">{value}</p>
              </div>
            ))}
          </section>
          <ExecutionProgress data={data} />
          {data.actions.length === 0 ? (
            <Empty />
          ) : (
            <section
              className="mt-6 grid gap-3"
              aria-label="Acciones del cierre"
            >
              {data.actions.map((action) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  busy={saving === action.id}
                  onStatus={status}
                  onDetails={details}
                  canExecute={permissions.includes('operations.write') || permissions.includes('close.manage')}
                  canManage={permissions.includes('close.manage')}
                />
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}
function ExecutionProgress({data}:{data:FinancialActionPlan}){const total=data.open_count+data.done_count,done=total?Math.round(data.done_count/total*100):0;return <section aria-labelledby="execution-progress-title" className="mt-5 rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold text-primary">Capítulo 3 · La decisión</p><h2 id="execution-progress-title" className="mt-1 text-lg font-semibold">De la alerta a la ejecución</h2><p className="mt-1 text-sm text-muted-foreground">Completar no prueba impacto; confirma que la decisión fue ejecutada.</p></div><p className="text-3xl font-bold text-primary">{done}%</p></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Avance del plan semanal" aria-valuemin={0} aria-valuemax={100} aria-valuenow={done}><div className="h-full rounded-full bg-primary transition-[width] duration-200 motion-reduce:transition-none" style={{width:`${done}%`}}/></div><div className="mt-4 grid gap-2 sm:grid-cols-3"><Story label="Primero" value={`${data.open_count} por ejecutar`} text="Asigna dueño y fecha."/><Story label="Atención" value={`${data.overdue_count} vencidas`} text="Desbloquea o reprograma."/><Story label="Después" value={`${data.done_count} completadas`} text="Contrasta con el próximo cierre."/></div></section>}
function Story({label,value,text}:{label:string;value:string;text:string}){return <div className="rounded-xl bg-muted/40 p-3"><p className="text-xs font-bold text-primary">{label.toUpperCase()}</p><p className="mt-1 font-semibold">{value}</p><p className="text-xs text-muted-foreground">{text}</p></div>}
function ActionCard({
  action,
  busy,
  onStatus,
  onDetails,
  canExecute,
  canManage,
}: {
  action: Action;
  busy: boolean;
  canExecute: boolean;
  canManage: boolean;
  onStatus: (id: string, s: Action["status"]) => Promise<void>;
  onDetails: (
    id: string,
    v: { assignee: string; dueDate: string; impact: number | null },
  ) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false),
    [assignee, setAssignee] = useState(
      action.assignee === "Por asignar" ? "" : (action.assignee ?? ""),
    ),
    [dueDate, setDueDate] = useState(action.due_date ?? ""),
    [impact, setImpact] = useState(
      action.expected_cash_impact === null
        ? ""
        : String(action.expected_cash_impact),
    );
  async function save() {
    if (assignee.trim().length < 2)
      return toast.error("Indica quién es responsable.");
    if (!dueDate) return toast.error("Indica una fecha límite.");
    await onDetails(action.id, {
      assignee: assignee.trim(),
      dueDate,
      impact: impact === "" ? null : Number(impact),
    });
    setEditing(false);
  }
  return (
    <article
      className={`rounded-2xl border p-5 ${action.status === "DONE" ? "border-primary/25 bg-primary/5" : "border-border bg-card"}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-semibold">{action.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {action.assignee || "Por asignar"} ·{" "}
            {action.due_date
              ? `vence ${date.format(new Date(action.due_date + "T12:00:00"))}`
              : "sin fecha"}{" "}
            · {action.priority}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Impacto esperado declarado:{" "}
            {action.expected_cash_impact === null
              ? "No informado"
              : money.format(action.expected_cash_impact)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && <button
            type="button"
            onClick={() => setEditing(!editing)}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <Pencil className="size-4" />
            Editar
          </button>}
          {canExecute ? <select
            aria-label={"Estado de " + action.title}
            value={action.status}
            disabled={busy}
            onChange={(e) =>
              void onStatus(action.id, e.target.value as Action["status"])
            }
            className="min-h-11 cursor-pointer rounded-lg border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/60"
          >
            <option value="OPEN">Pendiente</option>
            <option value="IN_PROGRESS">En curso</option>
            <option value="BLOCKED">Bloqueada</option>
            <option value="DONE">Completada</option>
          </select> : <span className="inline-flex min-h-11 items-center rounded-lg border border-border bg-muted px-3 text-sm text-muted-foreground">Solo lectura</span>}
          {action.deep_link && (
            <Link
              to={action.deep_link}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted"
            >
              Resolver
              <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      </div>
      {editing && canManage && (
        <div className="mt-4 grid gap-4 rounded-xl border border-border bg-background/60 p-4 sm:grid-cols-3">
          <label className="text-sm font-medium">
            Responsable
            <input
              className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3 focus:ring-2 focus:ring-primary/60"
              value={assignee}
              maxLength={120}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="Nombre o cargo"
            />
          </label>
          <label className="text-sm font-medium">
            Fecha límite
            <input
              type="date"
              className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3 focus:ring-2 focus:ring-primary/60"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
          <label className="text-sm font-medium">
            Impacto esperado en caja
            <input
              type="number"
              className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3 focus:ring-2 focus:ring-primary/60"
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
              placeholder="+ mejora / − reduce"
            />
          </label>
          <p className="text-xs leading-5 text-muted-foreground sm:col-span-3">
            Este monto es una estimación declarada, no un resultado calculado
            por Denarius.
          </p>
          <div className="flex gap-2 sm:col-span-3">
            <button
              disabled={busy}
              onClick={() => void save()}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Guardar
            </button>
            <button
              onClick={() => setEditing(false)}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold"
            >
              <X className="size-4" />
              Cancelar
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
function Empty() {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center">
      <CheckCircle2 className="mx-auto size-7 text-primary" />
      <p className="mt-3 font-semibold">
        Registra un cierre para generar el primer plan.
      </p>
      <Link
        to="/weekly-close"
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
      >
        Ir al cierre
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
