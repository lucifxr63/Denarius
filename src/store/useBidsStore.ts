import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Oportunidades de venta pública (licitación/Compra Ágil) que el usuario carga
// a mano y opcionalmente simula en la proyección de caja (Fase 3, plan Luca→
// Denarius). Client-side only en esta fase: no hay backend de ChileCompra aún
// (Fase 2), así que persistimos en localStorage como el resto de la UI local.
export interface Bid {
  id: string;
  name: string; // institución o descripción breve
  amount: number;
  payDate: string; // YYYY-MM-DD, fecha estimada de pago
  probability: number; // 0–100
  /** "Simular en flujo de caja": si está activo, entra a la proyección. */
  active: boolean;
}

interface BidsState {
  bids: Bid[];
  addBid: (input: Omit<Bid, 'id' | 'active'>) => void;
  removeBid: (id: string) => void;
  toggleActive: (id: string) => void;
}

export const useBidsStore = create<BidsState>()(
  persist(
    (set) => ({
      bids: [],
      addBid: (input) =>
        set((s) => ({ bids: [...s.bids, { ...input, id: crypto.randomUUID(), active: true }] })),
      removeBid: (id) => set((s) => ({ bids: s.bids.filter((b) => b.id !== id) })),
      toggleActive: (id) =>
        set((s) => ({ bids: s.bids.map((b) => (b.id === id ? { ...b, active: !b.active } : b)) })),
    }),
    {
      name: 'cf_bids',
      version: 1,
    },
  ),
);
