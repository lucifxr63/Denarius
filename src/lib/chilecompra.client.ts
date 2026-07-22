// Capa de red de ChileCompra (MVP client-side, §D4). Separada de chilecompra.ts
// para que la lógica pura (URLs/parseo/filtros) se mantenga testeable sin fetch.
import {
  buildLicitacionesUrl,
  parseLicitaciones,
  filterByKeywords,
  ChileCompraError,
  type Opportunity,
} from './chilecompra';

/** Mensajes claros para los códigos HTTP que el plan pide manejar (2.2). */
function httpErrorMessage(status: number): string {
  if (status === 401) return 'Ticket de ChileCompra inválido o expirado. Revísalo en Ajustes.';
  if (status === 429) return 'ChileCompra está recibiendo muchas peticiones. Intenta de nuevo en unos segundos.';
  return `ChileCompra respondió con un error (HTTP ${status}).`;
}

/**
 * Busca licitaciones activas y las filtra por las keywords del tenant.
 * Lanza Error con mensaje legible ante 401/429/errores del API.
 */
export async function fetchLicitaciones(ticket: string, keywords: string[]): Promise<Opportunity[]> {
  if (!ticket.trim()) throw new Error('Configura tu ticket de ChileCompra en Ajustes primero.');

  const url = buildLicitacionesUrl(ticket, { estado: 'activas' });
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch {
    throw new Error('No se pudo conectar con ChileCompra. Revisa tu conexión.');
  }
  if (!res.ok) throw new Error(httpErrorMessage(res.status));

  const json = await res.json();
  try {
    const all = parseLicitaciones(json); // puede lanzar ChileCompraError (cuerpo {Codigo,Mensaje})
    return filterByKeywords(all, keywords);
  } catch (e) {
    if (e instanceof ChileCompraError) {
      // 10500 = rate limit del API aunque el HTTP sea 200.
      if (e.code === 10500) throw new Error(httpErrorMessage(429));
      throw new Error(e.message);
    }
    throw e;
  }
}
