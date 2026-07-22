import { useState } from 'react';
import { toast } from 'sonner';
import { Target, Plus, Trash2, PlayCircle, PauseCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCLP } from '@/lib/utils';
import { useConfirm } from '@/components/ui/confirm';
import type { Bid } from '@/store/useBidsStore';

interface Props {
  items: Bid[];
  onAdd: (input: { name: string; amount: number; payDate: string; probability: number }) => void;
  onRemove: (id: string) => void;
  onToggleActive: (id: string) => void;
}

const inputCls =
  'h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary/60';

export function BidsPanel({ items, onAdd, onRemove, onToggleActive }: Props) {
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [probability, setProbability] = useState('50');
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const amt = Number(amount);
    const prob = Number(probability);
    if (!name.trim() || !(amt > 0)) {
      setErr('Indica institución/descripción y un monto válido.');
      return;
    }
    if (!(prob >= 0 && prob <= 100)) {
      setErr('La probabilidad debe estar entre 0 y 100.');
      return;
    }
    onAdd({ name: name.trim(), amount: amt, payDate, probability: prob });
    setName('');
    setAmount('');
    setProbability('50');
    setOpen(false);
  }

  async function remove(item: Bid) {
    if (!(await confirm({ title: '¿Eliminar oportunidad?', message: `${item.name} · ${formatCLP(item.amount)}`, danger: true, confirmLabel: 'Eliminar' }))) return;
    try {
      onRemove(item.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur">
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target className="size-5 text-accent" aria-hidden="true" />
          <h3 className="font-semibold">Oportunidades de Licitación</h3>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
          <Plus className="size-4" aria-hidden="true" />
          Nueva oportunidad
        </Button>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Carga manual (Mercado Público / Compra Ágil aún no conectados). Simula el impacto de adjudicarte un contrato en tu flujo de caja.
      </p>

      {open && (
        <form onSubmit={submit} className="mb-4 space-y-3 rounded-lg border border-border bg-background/40 p-4">
          <input
            className={inputCls}
            placeholder="Institución / descripción (ej: Municipalidad de Temuco)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Institución o descripción"
          />
          <div className="grid grid-cols-2 gap-3">
            <input className={inputCls} type="number" min="0" step="1" placeholder="Monto esperado" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Monto esperado" />
            <input className={inputCls} type="number" min="0" max="100" step="1" placeholder="Probabilidad %" value={probability} onChange={(e) => setProbability(e.target.value)} aria-label="Probabilidad de adjudicación" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="bid-paydate">Fecha estimada de pago</label>
            <input id="bid-paydate" className={inputCls} type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
          </div>
          {err && <p className="text-xs text-danger">{err}</p>}
          <Button type="submit" size="sm" className="w-full">Agregar oportunidad</Button>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin oportunidades cargadas. Agrega una licitación o Compra Ágil a la que postulaste para simular su impacto en la caja.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((b) => (
            <li key={b.id} className={`group flex items-center justify-between gap-2 rounded-lg border border-border bg-card/40 px-3 py-2 ${b.active ? '' : 'opacity-50'}`}>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{b.name}</span>
                <span className="text-xs text-muted-foreground">Pago est. {b.payDate} · {b.probability}% probabilidad</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-accent">{formatCLP(b.amount)}</span>
                <button
                  onClick={() => onToggleActive(b.id)}
                  className={`grid size-7 place-items-center rounded-md cursor-pointer transition-colors hover:bg-muted ${b.active ? 'text-accent' : 'text-muted-foreground'}`}
                  title={b.active ? 'Quitar de la simulación' : 'Simular en flujo de caja'}
                  aria-label={b.active ? `Quitar ${b.name} de la simulación` : `Simular ${b.name} en flujo de caja`}
                >
                  {b.active ? <PauseCircle className="size-4" aria-hidden="true" /> : <PlayCircle className="size-4" aria-hidden="true" />}
                </button>
                <button
                  onClick={() => remove(b)}
                  className="grid size-7 place-items-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-danger group-hover:opacity-100 cursor-pointer"
                  aria-label={`Eliminar ${b.name}`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
