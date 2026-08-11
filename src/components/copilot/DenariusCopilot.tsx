import { FormEvent, useEffect, useRef, useState } from 'react';
import { Bot, ExternalLink, History, LoaderCircle, MessageCircle, Send, ShieldCheck, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { routeFinancialQuestion } from '@/lib/financial-orchestrator';
import { invokeFinancialTool } from '@/lib/denarius-tools-client';
import { formatToolResult } from '@/lib/copilot-presenter';
import type { EvidenceItem, EvidenceSource, FinancialToolName } from '@/lib/financial-tools';
import { deleteCopilotHistory, getDefaultTenant, listCopilotHistory, saveCopilotHistory, type CopilotHistoryEntry } from '@/lib/queries';
import { CopilotHistoryPanel } from './CopilotHistoryPanel';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: EvidenceSource[];
  asOf?: string;
  tool?: FinancialToolName;
  evidence?: EvidenceItem[];
  navigation?: { path: string; label: string };
}

const suggestions = [
  '¿Cuánta caja disponible tengo hoy?',
  '¿Cuál es mi burn y runway actual?',
  '¿Me quedaré sin caja en 90 días?',
  'Resume esta semana para el dueño',
];

function messageId() {
  const randomUuid = globalThis.crypto?.randomUUID;
  return typeof randomUuid === 'function'
    ? randomUuid.call(globalThis.crypto)
    : `message-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const toolLinks: Partial<Record<FinancialToolName, { to: string; label: string }>> = {
  get_cash_position: { to: '/operations#financial-kpis', label: 'Ver caja' },
  get_runway_and_burn: { to: '/operations#financial-kpis', label: 'Ver indicadores' },
  get_cash_projection: { to: '/operations#cash-projection', label: 'Ver proyección' },
  explain_projection_point: { to: '/operations#cash-projection', label: 'Ver proyección' },
  list_overdue_invoices: { to: '/operations#overdue-invoices', label: 'Ver facturas' },
  get_restricted_cash: { to: '/operations#financial-kpis', label: 'Ver caja restringida' },
  get_financial_summary: { to: '/dashboard', label: 'Abrir dashboard' },
};

export function DenariusCopilot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [history, setHistory] = useState<CopilotHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else launcherRef.current?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);
  useEffect(() => { void getDefaultTenant().then(async (tenant) => { if (!tenant) return; setTenantId(tenant.id); setHistory(await listCopilotHistory(tenant.id)); }).catch(() => undefined); }, []);

  const ask = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setMessages((current) => [...current, { id: messageId(), role: 'user', text: trimmed }]);
    setInput('');
    const decision = routeFinancialQuestion(trimmed);
    if (decision.kind !== 'tool') {
      setMessages((current) => [...current, { id: messageId(), role: 'assistant', text: decision.message }]);
      return;
    }
    setLoading(true);
    try {
      const result = await invokeFinancialTool(decision.request);
      const answer = formatToolResult(result);
      setMessages((current) => [...current, {
        id: messageId(), role: 'assistant', text: answer,
        sources: result.sources, asOf: result.as_of, tool: result.tool, evidence: result.evidence, navigation: result.navigation,
      }]);
      const activeTenant = result.tenant_id || tenantId;
      if (activeTenant) {
        try {
          const id = await saveCopilotHistory({ tenantId: activeTenant, question: trimmed, answer, tool: result.tool, asOf: result.as_of, deepLink: result.navigation.path, evidence: result.evidence });
          setTenantId(activeTenant);
          setHistory((current) => [{ id, tenant_id: activeTenant, question: trimmed, answer_summary: answer, tool_name: result.tool, as_of: result.as_of, deep_link: result.navigation.path, evidence: result.evidence, created_at: new Date().toISOString() }, ...current]);
        } catch { /* La consulta sigue disponible si el historial falla. */ }
      }
    } catch (error) {
      setMessages((current) => [...current, {
        id: messageId(), role: 'assistant',
        text: error instanceof Error ? error.message : 'No pudimos completar la consulta.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const submit = (event: FormEvent) => { event.preventDefault(); void ask(input); };

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 grid size-12 cursor-pointer place-items-center rounded-full bg-accent text-white shadow-lg shadow-accent/20 transition-colors duration-200 hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="Abrir copiloto financiero"
        aria-expanded={open}
      >
        <MessageCircle className="size-5" aria-hidden="true" />
      </button>

      {open && (
        <section
          className="fixed inset-x-3 bottom-3 z-50 flex max-h-[min(720px,calc(100vh-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:h-[min(680px,calc(100vh-2.5rem))] sm:w-[400px]"
          role="dialog"
          aria-modal="false"
          aria-labelledby="denarius-copilot-title"
        >
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent"><Bot className="size-5" aria-hidden="true" /></span>
              <div className="min-w-0">
                <h2 id="denarius-copilot-title" className="truncate font-display font-semibold">Copiloto Denarius</h2>
                <p className="flex items-center gap-1 text-xs text-muted-foreground"><ShieldCheck className="size-3" aria-hidden="true" /> Solo lectura · historial controlado por ti</p>
              </div>
            </div>
            <div className="flex"><button type="button" onClick={() => setShowHistory((value) => !value)} className="grid size-11 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Ver historial"><History className="size-5" /></button><button type="button" onClick={() => setOpen(false)} className="grid size-11 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Cerrar copiloto">
              <X className="size-5" aria-hidden="true" />
            </button></div>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite" aria-busy={loading}>
            {showHistory && <CopilotHistoryPanel entries={history} onDelete={(id) => { if (!tenantId) return; void deleteCopilotHistory(tenantId, id).then(() => setHistory((current) => current.filter((entry) => entry.id !== id))); }} onClear={() => { if (!tenantId) return; void deleteCopilotHistory(tenantId, null).then(() => setHistory([])); }} />}
            {messages.length === 0 && (
              <div>
                <p className="text-sm leading-6 text-foreground">Consulta tu caja, runway, proyección o facturas vencidas. Cada respuesta usa la empresa activa de tu sesión.</p>
                <div className="mt-4 grid gap-2">
                  {suggestions.map((suggestion) => (
                    <button key={suggestion} type="button" onClick={() => void ask(suggestion)} className="min-h-11 cursor-pointer rounded-xl border border-border px-3 py-2 text-left text-sm leading-5 transition-colors hover:border-accent/50 hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message) => {
              const link = message.navigation ? { to: message.navigation.path, label: message.navigation.label } : message.tool ? toolLinks[message.tool] : undefined;
              return (
                <article key={message.id} className={message.role === 'user' ? 'ml-8 rounded-2xl rounded-br-md bg-accent px-3.5 py-2.5 text-sm leading-6 text-white' : 'mr-5 rounded-2xl rounded-bl-md border border-border bg-muted/50 px-3.5 py-3 text-sm leading-6'}>
                  <p>{message.text}</p>
                  {message.asOf && <p className="mt-2 text-xs text-muted-foreground">Corte: {message.asOf}</p>}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Fuentes">
                      {message.sources.map((source) => <span key={`${source.kind}-${source.name}`} className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground">{source.name}</span>)}
                    </div>
                  )}
                  {message.evidence && message.evidence.length > 0 && <dl className="mt-2 grid gap-1">{message.evidence.map((item) => <div key={`${item.label}-${item.value}`} className="flex justify-between gap-3 rounded-md bg-card px-2 py-1 text-xs"><dt className="text-muted-foreground">{item.label}</dt><dd className="font-medium">{String(item.value)}</dd></div>)}</dl>}
                  {link && <Link to={link.to} onClick={() => setOpen(false)} className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><ExternalLink className="size-4" aria-hidden="true" />{link.label}</Link>}
                </article>
              );
            })}
            {loading && <div className="mr-16 flex items-center gap-2 rounded-2xl border border-border bg-muted/50 px-3.5 py-3 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Consultando datos financieros…</div>}
            <div ref={endRef} />
          </div>

          <form onSubmit={submit} className="border-t border-border bg-card p-3">
            <label htmlFor="denarius-copilot-input" className="sr-only">Pregunta financiera</label>
            <div className="flex items-end gap-2">
              <input id="denarius-copilot-input" ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} disabled={loading} placeholder="Pregunta sobre tu caja…" autoComplete="off" className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/30" />
              <Button type="submit" variant="accent" size="md" disabled={loading || !input.trim()} className="size-11 px-0" aria-label="Enviar pregunta"><Send className="size-4" aria-hidden="true" /></Button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
