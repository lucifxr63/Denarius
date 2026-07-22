// Cliente/parser de las APIs públicas de ChileCompra (Mercado Público).
// Lógica PURA (sin fetch): construcción de URLs, normalización de respuestas y
// filtrado por palabras clave. Es el núcleo reutilizable tanto por un fetch
// client-side (MVP) como por una Edge Function server-side (producción, §D4 del
// plan). El fetch en sí vive fuera de este módulo para mantenerlo testeable.
//
// Fuentes (plan Luca→Denarius, Épica 2):
//   · Licitaciones tradicionales: api.mercadopublico.cl (ticket en query string).
//   · Compra Ágil: api2.mercadopublico.cl (ticket en header HTTP).

export type OpportunitySource = 'licitacion' | 'compra-agil';

// Oportunidad normalizada que consume la UI. Se puede mapear a un `Bid`
// (useBidsStore) con un clic para simularla en el flujo de caja (Fase 3).
export interface Opportunity {
  source: OpportunitySource;
  code: string; // CodigoExterno
  name: string;
  organism: string | null; // institución compradora (si viene en el detalle)
  estimatedAmount: number | null; // monto estimado (si disponible)
  closingDate: string | null; // fecha de cierre YYYY-MM-DD
  url: string; // enlace a la ficha pública
}

// Error tipado de la API (ej. { "Codigo": 10500, "Mensaje": "…peticiones simultáneas" }).
export class ChileCompraError extends Error {
  constructor(public code: number, message: string) {
    super(message);
    this.name = 'ChileCompraError';
  }
}

const LICITACIONES_BASE = 'https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json';
const COMPRA_AGIL_BASE = 'https://api2.mercadopublico.cl/servicios/v1/publico/cotizaciones';

// ── Construcción de URLs ────────────────────────────────────────────────────

export interface LicitacionesQuery {
  /** Estado: 'activas' | 'publicadas' | 'cerradas' | 'adjudicadas' … */
  estado?: string;
  /** Fecha en formato ddmmaaaa (formato que exige el API v1). */
  fecha?: string;
  /** Código específico → devuelve el detalle completo de esa licitación. */
  codigo?: string;
}

export function buildLicitacionesUrl(ticket: string, q: LicitacionesQuery = {}): string {
  const params = new URLSearchParams();
  if (q.codigo) params.set('codigo', q.codigo);
  if (q.estado) params.set('estado', q.estado);
  if (q.fecha) params.set('fecha', q.fecha);
  params.set('ticket', ticket);
  return `${LICITACIONES_BASE}?${params.toString()}`;
}

export function buildCompraAgilUrl(path = ''): string {
  return `${COMPRA_AGIL_BASE}${path}`;
}

/** El ticket de Compra Ágil viaja en header (no en query). */
export function compraAgilHeaders(ticket: string): Record<string, string> {
  return { ticket, Accept: 'application/json' };
}

/** ddmmaaaa que exige el API de licitaciones a partir de un Date. */
export function toChileCompraDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}${mm}${d.getFullYear()}`;
}

// ── Parseo de respuestas ────────────────────────────────────────────────────

/** Normaliza la fecha del API (ISO o "YYYY-MM-DDTHH:mm:ss") a YYYY-MM-DD. */
function normalizeDate(v: unknown): string | null {
  if (typeof v !== 'string' || v.length < 10) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(v);
  return m ? m[1] : null;
}

function toNumberOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
}

export function portalUrl(code: string): string {
  // Ficha pública de la licitación por código externo.
  return `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${encodeURIComponent(code)}`;
}

interface RawLicitacion {
  CodigoExterno?: string;
  Nombre?: string;
  FechaCierre?: string;
  MontoEstimado?: number | string;
  Comprador?: { NombreOrganismo?: string };
}

/**
 * Parsea la respuesta de `licitaciones.json`. Lanza ChileCompraError si el
 * cuerpo trae `{Codigo, Mensaje}` (rate limit, ticket inválido, etc.).
 */
export function parseLicitaciones(json: unknown): Opportunity[] {
  if (!json || typeof json !== 'object') return [];
  const obj = json as Record<string, unknown>;

  // Forma de error del API: { "Codigo": 10500, "Mensaje": "..." } sin Listado.
  if (obj.Listado === undefined && typeof obj.Codigo === 'number') {
    throw new ChileCompraError(obj.Codigo as number, String(obj.Mensaje ?? 'Error de ChileCompra'));
  }

  const listado = Array.isArray(obj.Listado) ? (obj.Listado as RawLicitacion[]) : [];
  return listado
    .filter((it) => it && typeof it.CodigoExterno === 'string')
    .map((it) => ({
      source: 'licitacion' as const,
      code: it.CodigoExterno!,
      name: (it.Nombre ?? '').trim(),
      organism: it.Comprador?.NombreOrganismo?.trim() ?? null,
      estimatedAmount: toNumberOrNull(it.MontoEstimado),
      closingDate: normalizeDate(it.FechaCierre),
      url: portalUrl(it.CodigoExterno!),
    }));
}

// ── Filtrado por palabras clave ─────────────────────────────────────────────

/** Minúsculas + sin acentos, para comparar nombres en español de forma robusta. */
function fold(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** ¿El nombre de la oportunidad contiene alguna de las keywords? (sin keywords = todo pasa) */
export function matchesKeywords(name: string, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  const hay = fold(name);
  return keywords.some((k) => k.trim() !== '' && hay.includes(fold(k.trim())));
}

export function filterByKeywords(items: Opportunity[], keywords: string[]): Opportunity[] {
  const active = keywords.filter((k) => k.trim() !== '');
  if (active.length === 0) return items;
  return items.filter((it) => matchesKeywords(it.name, active));
}
