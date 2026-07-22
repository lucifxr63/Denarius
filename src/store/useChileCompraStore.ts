import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Configuración de la integración con Mercado Público (ChileCompra), Fase 2.
// MVP client-side (§D4): el ticket es una API key de SOLO LECTURA sobre datos
// públicos de licitaciones (bajo riesgo, regenerable). En producción conviene
// moverlo a un proxy/Edge Function (ver LUCA_INTEGRATION_PLAN.md §D4/§D5).
interface ChileCompraState {
  ticket: string;
  /** Palabras clave de interés (ej: "software", "panadería"). */
  keywords: string[];
  setTicket: (ticket: string) => void;
  setKeywords: (keywords: string[]) => void;
}

export const useChileCompraStore = create<ChileCompraState>()(
  persist(
    (set) => ({
      ticket: '',
      keywords: [],
      setTicket: (ticket) => set({ ticket: ticket.trim() }),
      setKeywords: (keywords) => set({ keywords }),
    }),
    {
      name: 'cf_chilecompra',
      version: 1,
    },
  ),
);
