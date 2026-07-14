// Decodificador de código de barras PDF417 desde el PDF de un DTE chileno.
//
// El Timbre Electrónico (TED) del SII se imprime como un PDF417. Aquí:
//   1. Rasterizamos la PÁGINA 1 del PDF a un <canvas> a alta densidad (el PDF417 es
//      denso; a baja resolución falla la lectura).
//   2. Decodificamos el PDF417 con @zxing/library por la ruta manual (core), porque
//      el lector de navegador de esta versión no soporta decodificar desde canvas.
//
// Devuelve la cadena cruda del timbre (XML <TED>) o `null` si no hay PDF417 legible
// → el llamador cae limpio al flujo de IA de respaldo (§D3: solo PDF en Fase 1).

import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
} from '@zxing/library';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

// Escalas de render a probar (px por unidad PDF). El TED es denso: empezamos alto.
const RENDER_SCALES = [4, 3, 2.5];

// Rotaciones a intentar por escala. Cubre fotos tomadas de lado o al revés
// (WhatsApp). No corrige perspectiva/inclinación —eso ZXing no lo tolera bien—,
// pero rescata los casos de rotación simple sin costo extra de render.
const ROTATIONS = [0, 180, 90, 270];

/** Devuelve un canvas con `src` rotado `deg` grados (0 = el mismo canvas). */
function rotateCanvas(src: HTMLCanvasElement, deg: number): HTMLCanvasElement {
  if (deg === 0) return src;
  const swap = deg === 90 || deg === 270;
  const out = document.createElement('canvas');
  out.width = swap ? src.height : src.width;
  out.height = swap ? src.width : src.height;
  const ctx = out.getContext('2d');
  if (!ctx) return src;
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  return out;
}

/** Decodifica un PDF417 presente en el canvas. `null` si no encuentra ninguno. */
function decodeCanvas(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // RGBA (4 bytes/px) → luminancia (1 byte/px) que espera RGBLuminanceSource.
  const luminances = new Uint8ClampedArray(width * height);
  for (let i = 0, j = 0; i < luminances.length; i++, j += 4) {
    // Luma perceptual (mejor contraste para barras que un promedio plano).
    luminances[i] = (data[j] * 0.299 + data[j + 1] * 0.587 + data[j + 2] * 0.114) & 0xff;
  }

  const source = new RGBLuminanceSource(luminances, width, height);
  const bitmap = new BinaryBitmap(new HybridBinarizer(source));

  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.PDF_417]);
  hints.set(DecodeHintType.TRY_HARDER, true);

  const reader = new MultiFormatReader();
  reader.setHints(hints);
  try {
    return reader.decode(bitmap, hints).getText();
  } catch {
    return null; // NotFoundException u otros → sin timbre en esta escala
  } finally {
    reader.reset();
  }
}

/**
 * Intenta leer el PDF417 del TED en la página 1 de un PDF. `null` si no hay timbre
 * legible o el archivo no es PDF.
 */
export async function scanPdf417(file: File): Promise<string | null> {
  if (file.type !== 'application/pdf') return null; // §D3: solo PDF en Fase 1
  let pdf: Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']> | null = null;
  try {
    const buf = await file.arrayBuffer();
    pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const page = await pdf.getPage(1); // el timbre está en la 1ª página

    for (const scale of RENDER_SCALES) {
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      // Rotación es barata (no re-renderiza el PDF); probamos cada una en esta escala.
      for (const deg of ROTATIONS) {
        const text = decodeCanvas(rotateCanvas(canvas, deg));
        if (text) return text;
      }
    }
    return null;
  } catch {
    return null; // PDF corrupto, protegido, etc. → fallback IA
  } finally {
    if (pdf) await pdf.cleanup().catch(() => {});
  }
}
