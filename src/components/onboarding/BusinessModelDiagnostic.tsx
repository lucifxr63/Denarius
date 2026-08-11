import { useMemo, useState } from 'react';
import { Building2, Check, ChevronLeft, ChevronRight, Rocket, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  BUSINESS_MODEL_QUESTIONS,
  diagnoseBusinessModel,
  type BusinessModel,
  type DiagnosticAnswers,
  type DiagnosticAnswer,
} from '@/lib/business-model-diagnostic';
import { cn } from '@/lib/utils';

interface Props {
  companyName: string;
  onConfirm: (model: BusinessModel, answers: DiagnosticAnswers) => Promise<void>;
}

export function BusinessModelDiagnostic({ companyName, onConfirm }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<DiagnosticAnswers>({});
  const [reviewing, setReviewing] = useState(false);
  const [selectedModel, setSelectedModel] = useState<BusinessModel | null>(null);
  const [saving, setSaving] = useState(false);
  const question = BUSINESS_MODEL_QUESTIONS[step];
  const result = useMemo(() => diagnoseBusinessModel(answers), [answers]);
  const recommendation = selectedModel ?? result.model;

  const choose = (answer: DiagnosticAnswer) => {
    const nextAnswers = { ...answers, [question.id]: answer };
    setAnswers(nextAnswers);
    if (step === BUSINESS_MODEL_QUESTIONS.length - 1) setReviewing(true);
    else setStep((current) => current + 1);
  };

  const confirm = async () => {
    setSaving(true);
    try {
      await onConfirm(recommendation, answers);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No pudimos guardar la recomendación.');
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:py-14">
      <section className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-black/5">
        <div className="border-b border-border bg-gradient-to-br from-primary/15 via-card to-card px-6 py-7 sm:px-10">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Sparkles className="size-4" aria-hidden="true" /> Configuración inteligente
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Encontremos la vista correcta para {companyName}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Responde seis preguntas. Denarius recomendará un modelo y tú tendrás siempre la decisión final.
          </p>
        </div>

        {!reviewing ? (
          <div className="px-6 py-7 sm:px-10 sm:py-9">
            <div className="mb-7 flex items-center gap-3" aria-label={`Pregunta ${step + 1} de ${BUSINESS_MODEL_QUESTIONS.length}`}>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((step + 1) / BUSINESS_MODEL_QUESTIONS.length) * 100}%` }} />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{step + 1}/{BUSINESS_MODEL_QUESTIONS.length}</span>
            </div>
            <h2 className="text-xl font-semibold">{question.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{question.help}</p>
            <div className="mt-6 grid gap-3">
              {question.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => choose(option.value)}
                  className="group rounded-2xl border border-border bg-background p-4 text-left transition hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="flex items-center justify-between gap-3 font-medium">
                    {option.label}<ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-muted-foreground">{option.description}</span>
                </button>
              ))}
            </div>
            {step > 0 && (
              <button type="button" onClick={() => setStep((current) => current - 1)} className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ChevronLeft className="size-4" aria-hidden="true" /> Volver
              </button>
            )}
          </div>
        ) : (
          <div className="px-6 py-7 sm:px-10 sm:py-9">
            <p className="text-sm font-medium text-primary">Recomendación de Denarius</p>
            <h2 className="mt-1 font-display text-2xl font-bold">{result.model === 'startup-saas' ? 'Startup SaaS' : 'PyME Tradicional'}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Confianza {result.confidence === 'high' ? 'alta' : result.confidence === 'medium' ? 'media' : 'inicial'} · {result.startupScore} señales Startup · {result.pymeScore} señales PyME
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              {result.reasons.map((reason) => <li key={reason} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />{reason}</li>)}
            </ul>

            <fieldset className="mt-7">
              <legend className="text-sm font-semibold">Puedes confirmar o elegir otra vista</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {([
                  { id: 'pyme-tradicional', label: 'PyME Tradicional', icon: Building2, detail: 'Liquidez, impuestos y capital de trabajo' },
                  { id: 'startup-saas', label: 'Startup SaaS', icon: Rocket, detail: 'MRR, burn, runway y crecimiento' },
                ] as const).map((model) => {
                  const Icon = model.icon;
                  const active = recommendation === model.id;
                  return (
                    <button key={model.id} type="button" onClick={() => setSelectedModel(model.id)} className={cn('rounded-2xl border p-4 text-left transition', active ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border hover:bg-muted')}>
                      <Icon className={cn('size-5', active ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true" />
                      <span className="mt-3 block font-medium">{model.label}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{model.detail}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button type="button" onClick={() => { setReviewing(false); setStep(BUSINESS_MODEL_QUESTIONS.length - 1); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium hover:bg-muted">
                <ChevronLeft className="size-4" aria-hidden="true" /> Revisar respuestas
              </button>
              <button type="button" disabled={saving} onClick={confirm} className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                {saving ? 'Guardando…' : 'Usar esta vista'}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
