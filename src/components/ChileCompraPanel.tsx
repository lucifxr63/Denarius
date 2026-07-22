import { useState } from 'react';
import { toast } from 'sonner';
import { Landmark, Search, Settings2, ExternalLink, PlusCircle, Loader2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCLP } from '@/lib/utils';
import { fetchLicitaciones } from '@/lib/chilecompra.client';
import type { Opportunity } from '@/lib/chilecompra';
import { useChileCompraStore } from '@/store/useChileCompraStore';

interface Props {
  /** Agrega una oportunidad como bid simulable (conecta con la Fase 3). */
  onSimulate: (input: { name: string; amount: number; payDate: string; probability: number }) => void;
}

const inputCls =
  'h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary/60';

// Heurística de fecha de pago: cierre + ~60 días (adjudicación + ejecución + pago).
function estimatePayDate(closingDate: string | null): string {
  const base = closingDate ? new Date(closingDate + 'T00:00:00') : new Date();
  base.setDate(base.getDate() + 60);
  return base.toISOString().slice(0, 10);
}

export function ChileCompraPanel({ onSimulate }: Props) {
  const { ticket, keywords, setTicket, setKeywords } = useChileCompraStore();
  const [showConfig, setShowConfig] = useState(!ticket);
  const [ticketDraft, setTicketDraft] = useState(ticket);
  const [keywordsDraft, setKeywordsDraft] = useState(keywords.join(', '));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Opportunity[] | null>(null);

  function saveConfig() {
    setTicket(ticketDraft);
    setKeywords(keywordsDraft.split(',').map((k) => k.trim()).filter(Boolean));
    setShowConfig(false);
    toast.success('Configuración de Mercado Público guardada');
  }

  async function search() {
    setError(null);
    setLoading(true);
    setResults(null);
    try {
      const opps = await fetchLicitaciones(ticket, keywords);
      setResults(opps);
      if (opps.length === 0) toast.info('Sin licitaciones activas que coincidan con tus palabras clave.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo buscar en ChileCompra.');
    } finally {
      setLoading(false);
    }
  }

  function simulate(o: Opportunity) {
    onSimulate({
      name: o.organism ? `${o.name} · ${o.organism}` : o.name,
      amount: o.estimatedAmount ?? 0,
      payDate: estimatePayDate(o.closingDate),
      probability: 50,
    });
    toast.success('Agregada a la simulación de flujo de caja');
  }

  const ticketMask = ticket ? `${ticket.slice(0, 4)}…${ticket.slice(-4)}` : null;

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur">
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Landmark className="size-5 text-accent" aria-hidden="true" />
          <h3 className="font-semibold">Mercado Público</h3>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setShowConfig((v) => !v)}>
          <Settings2 className="size-4" aria-hidden="true" />
          Configurar
        </Button>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Monitorea licitaciones activas de ChileCompra según tus palabras clave y simula su impacto en la caja.
      </p>

      {showConfig && (
        <div className="mb-4 space-y-3 rounded-lg border border-border bg-background/40 p-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="cc-ticket">
              Ticket de ChileCompra (API key personal)
            </label>
            <input
              id="cc-ticket"
              className={inputCls}
              type="text"
              placeholder="Ej: F8537A18-6766-4DEF-9E59-426B4FEE2844"
              value={ticketDraft}
              onChange={(e) => setTicketDraft(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="cc-keywords">
              Palabras clave (separadas por coma)
            </label>
            <input
              id="cc-keywords"
              className={inputCls}
              type="text"
              placeholder="software, panadería, construcción"
              value={keywordsDraft}
              onChange={(e) => setKeywordsDraft(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={saveConfig} className="w-full">Guardar configuración</Button>
        </div>
      )}

      {!showConfig && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 px-3 py-2 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <KeyRound className="size-3.5" aria-hidden="true" />
            {ticketMask ? `Ticket ${ticketMask}` : 'Sin ticket configurado'}
            {keywords.length > 0 && <span>· {keywords.length} palabra{keywords.length === 1 ? '' : 's'} clave</span>}
          </span>
          <Button size="sm" variant="outline" onClick={search} disabled={loading || !ticket}>
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Search className="size-4" aria-hidden="true" />}
            Buscar
          </Button>
        </div>
      )}

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      {results && results.length > 0 && (
        <ul className="space-y-1.5">
          {results.map((o) => (
            <li key={o.code} className="rounded-lg border border-border bg-card/40 px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{o.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {o.organism ?? 'Institución no especificada'}
                    {o.closingDate && ` · cierra ${o.closingDate}`}
                    {o.estimatedAmount != null && ` · ${formatCLP(o.estimatedAmount)}`}
                  </span>
                </span>
                <a
                  href={o.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Ver en el portal de ChileCompra"
                  aria-label="Ver en el portal de ChileCompra"
                >
                  <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              </div>
              <button
                onClick={() => simulate(o)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/20 cursor-pointer"
              >
                <PlusCircle className="size-3.5" aria-hidden="true" />
                Simular en flujo de caja
              </button>
            </li>
          ))}
        </ul>
      )}

      {results && results.length === 0 && !error && (
        <p className="text-sm text-muted-foreground">Sin resultados para tus palabras clave.</p>
      )}
    </div>
  );
}
