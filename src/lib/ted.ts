// Parser del Timbre Electrónico DTE (TED) del SII de Chile.
//
// El TED es la firma bidimensional (PDF417) impresa en boletas/facturas chilenas.
// Su contenido es XML legible (no encriptado): los datos del documento viven en el
// nodo <DD> (Datos del Documento). Este módulo extrae esos campos de forma
// DETERMINISTA (sin IA, sin costo) para pre-llenar el formulario de facturas.
//
// Extracción por tags con regex (portable a navegador y Node — no depende de
// DOMParser). Los tags del <DD> son planos y sin anidación, así que es robusto.

export interface TedData {
  rutEmisor: string;               // <RE>  RUT de quien emite el documento
  tipoDte: number;                 // <TD>  código SII del tipo de DTE
  tipoDteLabel: string;            // etiqueta legible del <TD>
  folio: string;                   // <F>   folio del documento
  fechaEmision: string;            // <FE>  YYYY-MM-DD
  rutReceptor: string | null;      // <RR>  RUT del receptor (si viene)
  razonSocialReceptor: string | null; // <RSR>
  montoTotal: number;              // <MNT> monto total en CLP (entero)
  primerItem: string | null;       // <IT1> descripción del primer ítem
  /** Dirección por defecto (§D2): el usuario confirma/ajusta antes de guardar. */
  invoiceType: 'AR' | 'AP';
}

// Mapa de códigos <TD> del SII → etiqueta legible.
const TD_LABELS: Record<number, string> = {
  30: 'Factura',
  32: 'Factura no afecta/exenta',
  33: 'Factura Electrónica',
  34: 'Factura Exenta Electrónica',
  39: 'Boleta Electrónica',
  41: 'Boleta Exenta Electrónica',
  43: 'Liquidación-Factura',
  46: 'Factura de Compra',
  52: 'Guía de Despacho',
  56: 'Nota de Débito',
  61: 'Nota de Crédito',
  110: 'Factura de Exportación',
  111: 'Nota de Débito de Exportación',
  112: 'Nota de Crédito de Exportación',
};

/** Extrae el contenido de la primera aparición de un tag plano `<TAG>valor</TAG>`. */
function tag(xml: string, name: string): string | null {
  // Tolera atributos en el tag de apertura (ej. <TED version="1.0">) y espacios.
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([^<]*)</${name}>`, 'i').exec(xml);
  return m ? m[1].trim() : null;
}

/**
 * Parsea la cadena cruda de un TED. Devuelve `null` si no parece un timbre válido
 * (sin los campos mínimos), lo que deja al llamador caer al flujo IA de respaldo.
 */
export function parseTED(raw: string): TedData | null {
  if (!raw || !/<TED[\s>]/i.test(raw)) return null;

  const re = tag(raw, 'RE');
  const tdRaw = tag(raw, 'TD');
  const folio = tag(raw, 'F');
  const fe = tag(raw, 'FE');
  const mntRaw = tag(raw, 'MNT');

  // Campos mínimos indispensables para pre-llenar con confianza.
  if (!re || !tdRaw || !folio || !fe || !mntRaw) return null;

  const tipoDte = Number(tdRaw);
  const montoTotal = Number(mntRaw);
  if (!Number.isFinite(tipoDte) || !Number.isFinite(montoTotal)) return null;

  // <FE> del SII ya viene como YYYY-MM-DD; validamos el formato para no inyectar basura.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fe)) return null;

  return {
    rutEmisor: re,
    tipoDte,
    tipoDteLabel: TD_LABELS[tipoDte] ?? `DTE tipo ${tipoDte}`,
    folio,
    fechaEmision: fe,
    rutReceptor: tag(raw, 'RR'),
    razonSocialReceptor: tag(raw, 'RSR'),
    montoTotal: Math.round(montoTotal),
    primerItem: tag(raw, 'IT1'),
    invoiceType: 'AR', // §D2: default; el usuario confirma en el formulario
  };
}
