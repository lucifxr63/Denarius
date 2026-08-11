import { useMemo, useState } from 'react';
import { ArrowRight, Check, Landmark, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { BusinessModel } from '@/lib/business-model-diagnostic';
import { formatCLP } from '@/lib/utils';

type Submission = { accountName: string; openingBalance: number; monthlyIncome: number; monthlyCosts: number; firstProjectionDate: string };

export function FinancialBaselineSetup({ companyName, model, onComplete }: { companyName: string; model: BusinessModel; onComplete: (values: Submission) => Promise<void> }) {
  const firstDate = useMemo(() => { const date = new Date(); date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + 1); return date.toISOString().slice(0, 10); }, []);
  const [values, setValues] = useState({ accountName: 'Cuenta principal', openingBalance: '', monthlyIncome: '', monthlyCosts: '', firstProjectionDate: firstDate });
  const [busy, setBusy] = useState(false);
  const opening = Number(values.openingBalance) || 0;
  const income = Number(values.monthlyIncome) || 0;
  const costs = Number(values.monthlyCosts) || 0;
  const monthlyNet = income - costs;
  const change = (field: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement>) => setValues((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (opening < 0 || income < 0 || costs < 0) return toast.error('Los montos no pueden ser negativos');
    if (income === 0 && costs === 0) return toast.error('Agrega al menos un ingreso o costo mensual');
    setBusy(true);
    try {
      await onComplete({ accountName: values.accountName.trim() || 'Cuenta principal', openingBalance: opening, monthlyIncome: income, monthlyCosts: costs, firstProjectionDate: values.firstProjectionDate });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No pudimos preparar la proyección');
      setBusy(false);
    }
  };
  const input = 'mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/60';

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <section className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-black/5">
        <div className="border-b border-border bg-gradient-to-br from-primary/15 via-card to-card px-6 py-7 sm:px-10">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary"><Sparkles className="size-4" /> Paso final · primera proyección</div>
          <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Construyamos la línea base de {companyName}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Vista elegida: {model === 'startup-saas' ? 'Startup SaaS' : 'PyME Tradicional'}. Podrás ajustar todo después.</p>
        </div>
        <div className="grid gap-8 px-6 py-7 sm:px-10 lg:grid-cols-[1fr_300px]">
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">Nombre de la cuenta<input className={input} maxLength={80} value={values.accountName} onChange={change('accountName')} /></label>
            <label className="text-sm">Caja disponible hoy (CLP)<input className={input} type="number" min="0" step="1" value={values.openingBalance} onChange={change('openingBalance')} placeholder="5.000.000" /></label>
            <label className="text-sm">Primer mes proyectado<input className={input} type="date" value={values.firstProjectionDate} onChange={change('firstProjectionDate')} /></label>
            <label className="text-sm">Ingresos mensuales esperados<input className={input} type="number" min="0" step="1" value={values.monthlyIncome} onChange={change('monthlyIncome')} placeholder="3.000.000" /></label>
            <label className="text-sm">Costos fijos mensuales<input className={input} type="number" min="0" step="1" value={values.monthlyCosts} onChange={change('monthlyCosts')} placeholder="2.000.000" /></label>
            <button disabled={busy} className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60 sm:col-span-2">{busy ? 'Preparando proyección…' : 'Crear mi primera proyección'}<ArrowRight className="size-4" /></button>
          </form>
          <aside className="rounded-2xl border border-border bg-background/60 p-5">
            <Landmark className="size-6 text-primary" /><h2 className="mt-3 font-semibold">Vista previa</h2>
            <dl className="mt-4 space-y-3 text-sm"><div><dt className="text-muted-foreground">Caja inicial</dt><dd className="font-semibold">{formatCLP(opening)}</dd></div><div><dt className="text-muted-foreground">Flujo mensual estimado</dt><dd className={`font-semibold ${monthlyNet < 0 ? 'text-danger' : 'text-primary'}`}>{formatCLP(monthlyNet)}</dd></div></dl>
            <ul className="mt-5 space-y-2 text-xs text-muted-foreground">{['Cuenta bancaria inicial', 'Ingresos y costos recurrentes', 'Dashboard listo para decidir'].map((item) => <li key={item} className="flex gap-2"><Check className="size-4 shrink-0 text-primary" />{item}</li>)}</ul>
          </aside>
        </div>
      </section>
    </main>
  );
}
