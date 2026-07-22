# Plan de Integración: Funcionalidades de Luca en Denarius

> **Estado:** Borrador para revisión · **Rama:** `develop` · **Fecha:** 2026-07-14
> Este plan aterriza el backlog conceptual sobre la **arquitectura real** de Denarius
> (verificada en código, no supuesta). Lee primero la sección §0 — cambia el alcance
> de varias épicas.

---

## §0. Hallazgos de arquitectura real (leer antes de estimar)

Verificado leyendo `src/lib/queries.ts`, `src/lib/projection.ts`,
`src/components/InvoiceForm.tsx` y la migración `20260624120000`.

| Hallazgo | Evidencia | Impacto en el plan |
| :--- | :--- | :--- |
| **Ya existe ingesta de facturas con IA** (dropzone + `ParsedInvoice` + cuota 10/mes + `source_system`). | `queries.ts:22-37,247-270`; `InvoiceForm.tsx:71-110` | La Épica 1 (TED) **no crea flujo nuevo**: se inserta *antes* del parse IA en el dropzone existente. Menor esfuerzo del estimado. |
| **Las Edge Functions NO están en este repo.** Se invocan por nombre (`cashflow-invoices`, `cashflow-parse-pdf`, `cashflow-recurring`, `cashflow-tenant-settings`) pero `supabase/functions/` no existe localmente. | `queries.ts:58,156,208,255`; `ls supabase/` | **Épicas 2 y 4 tienen dependencia cross-repo.** Hay que ubicar/clonar el repo de funciones o crear el scaffold Deno. Bloqueante para esas fases. |
| **Tracking de migraciones roto — prohibido `supabase db push`.** Cambios de BD se aplican manualmente en una transacción + insert de versión. | Header migración `20260624120000:15-21` | Todo DDL nuevo (tablas/columnas de Épicas 2-4) sigue este protocolo manual. |
| **RLS "plana"**: `owner_id = auth.uid()`. Multi-tenant con `tenant_id` + `owner_id`. | RPCs `metrics_pyme/saas`; `queries.ts:5-6` | Tablas nuevas (`monitored_bids`, sim. licitaciones) deben replicar el patrón `owner_id + tenant_id` + policies. |
| **`source_system` enum = `MANUAL \| PDF_AI`** (TS y validación server). | `queries.ts:19` | Agregar `SII_TIMBRE_LOCAL` requiere: (a) tipo TS, (b) CHECK/enum en BD, (c) validación en `cashflow-invoices` (repo externo). Decisión abierta §D1. |
| **`cashflow.tenant`** ya tiene `default_tax_rate`, `ppm_rate`, `business_model`, `owner_id`. | migración `41-63` | Agregar `chilecompra_ticket` es un `ALTER ADD COLUMN IF NOT EXISTS` idempotente (patrón ya usado). |
| **El motor de proyección ya soporta "eventos fantasma".** `buildDailyProjection` usa `deltas[]` + `phantomEvents`; ya reserva impuesto sobre ingresos. | `projection.ts:60-125` | La Épica 3 es una **extensión natural**: un nuevo tipo de evento simulado que suma `monto*(prob/100)` a `deltas[idx]`. Bajo riesgo. |

---

## §1. Mapa de fases y secuenciación

```
Fase 1  Épica 1  TED/PDF417 local          ── 100% frontend, sin backend, sin secretos  ← EMPEZAR AQUÍ
Fase 3  Épica 3  Forecasting de licitación  ── 90% frontend (extiende projection.ts)     ← ALTO VALOR, SIN BACKEND
Fase 2  Épica 2  Integración ChileCompra    ── requiere Edge Function (repo externo) + secretos
Fase 4  Épica 4  Automatización pg_cron      ── depende de Fase 2
```

> **Reordenamiento recomendado vs. backlog:** hacer **Épica 3 antes que la 2**. La 3 es
> puramente frontend (extiende un motor que ya existe) y entrega el "gancho de valor"
> (simular impacto en flujo de caja) **sin** desbloquear la dependencia cross-repo de
> Edge Functions. La simulación puede alimentarse al principio de datos ingresados a
> mano; conectarla al feed automático de ChileCompra (Épica 2) es un enriquecimiento
> posterior, no un prerrequisito.

---

## §2. FASE 1 — Épica 1: Lectura determinista del Timbre Electrónico (TED/PDF417)

**Meta:** Cuando el usuario sube una factura/boleta chilena, intentar decodificar el
código PDF417 (`<TED>`) **localmente en el navegador**. Si hay timbre → pre-llenar el
formulario con 100% de precisión y **costo $0** (sin gastar cuota de IA). Si no →
fallback al flujo IA que ya existe.

### Dependencias npm
```
npm install @zxing/library pdfjs-dist
```
- `@zxing/library` — decodificación PDF417 (`MultiFormatReader` con hint `PDF_417`).
- `pdfjs-dist` — rasteriza la página 1 del PDF a `<canvas>` para escanear (ZXing lee
  de imagen/canvas, no de PDF directo).

### Tarea 1.1 — Parser puro del TED (sin dependencias, testeable primero)
- **Archivo nuevo:** `src/lib/ted.ts`
- Función `parseTED(raw: string): TedData | null` que:
  - Extrae el bloque `<TED>…</TED>` de la cadena cruda del barcode.
  - Parsea con `DOMParser` y lee: `<RE>` (RUT emisor), `<TD>` (tipo DTE), `<F>` (folio),
    `<FE>` (fecha emisión), `<MNT>` (monto total), `<RR>` (RUT receptor), `<RSR>` (razón social).
  - Mapea `<TD>` → texto y a `InvoiceType`:
    - `33` Factura Electrónica → `AP` o `AR` según quién sea el `<RE>` vs. el RUT del tenant.
    - `34` Factura Exenta, `39` Boleta, `41` Boleta Exenta, `52` Guía Despacho, `56` Nota Débito, `61` Nota Crédito.
  - Normaliza `<FE>` (`YYYY-MM-DD`) y `<MNT>` (entero CLP).
  - Devuelve `null` si el XML no tiene `<TED>` válido (deja pasar al fallback IA).
- **Criterio clave de dirección A/R vs A/P:** comparar `<RE>` (emisor) con el RUT del
  tenant. Si el tenant **emite** → es venta (`AR`); si el tenant es **receptor** (`<RR>`)
  → es compra (`AP`). Requiere conocer el RUT del tenant → ver §D2.
- **Tests:** `src/lib/ted.test.ts` con 3-4 cadenas TED reales de ejemplo (factura, boleta,
  nota de crédito, XML inválido). Esta pieza es 100% pura → se prueba sin navegador.

### Tarea 1.2 — Decodificador PDF417 desde archivo
- **Archivo nuevo:** `src/lib/pdf417.ts`
- `scanPdf417(file: File): Promise<string | null>`:
  - Si `file.type === 'application/pdf'`: cargar con `pdfjs-dist`, renderizar página 1 a
    canvas a ~300 DPI (los TED son densos; baja resolución = fallo de lectura).
  - Si es imagen: dibujar directo a canvas.
  - Pasar el canvas a ZXing con hint `PDF_417`; devolver el texto o `null`.
  - Envolver todo en try/catch → cualquier fallo = `null` (fallback limpio).

### Tarea 1.3 — Enganche en el dropzone existente (sin romper el flujo IA)
- **Archivo a modificar:** `src/components/InvoiceForm.tsx` (`handleFile`, línea 71).
- Nueva secuencia en `handleFile`, **antes** de llamar a `onParse` (IA):
  1. `const raw = await scanPdf417(file)`
  2. Si `raw`: `const ted = parseTED(raw)`.
  3. Si `ted`: pre-llenar con `setValue(...)`, `setSource('SII_TIMBRE_LOCAL')`, mostrar
     un badge verde "Leído del Timbre SII · sin costo IA" (espejo del bloque `aiInfo`,
     líneas 201-219, pero en verde/`accent`), y **`return` sin tocar la cuota**.
  4. Si no hay TED: continuar con el flujo IA actual sin cambios.
- Aceptar imágenes además de PDF en el `accept` del input (hoy `application/pdf` fijo,
  línea 154) — o dejar solo PDF si se decide no soportar fotos (ver §D3, fragilidad del
  PDF417 en fotos de boletas térmicas).
- El badge de cuota (líneas 176-178) debe reflejar que el timbre **no consume** lecturas.

### Tarea 1.4 — `source_system = 'SII_TIMBRE_LOCAL'`
- Extender el tipo TS `SourceSystem` en `queries.ts:19`.
- **Decisión §D1** define si esto viaja a la BD como valor nuevo (requiere tocar la Edge
  Function `cashflow-invoices` externa) o se mapea a `MANUAL` con un flag de metadata.

### Criterios de aceptación Fase 1
- [ ] Subir un PDF de factura SII con timbre pre-llena tipo/monto/fecha sin llamar a la IA.
- [ ] La cuota de PDFs IA **no** decrece cuando se leyó por timbre.
- [ ] Un PDF sin timbre (o una imagen ilegible) cae limpio al flujo IA actual.
- [ ] `parseTED` tiene tests verdes con casos factura/boleta/nota-crédito/inválido.
- [ ] `npm run build` (tsc --noEmit + vite build) pasa sin errores de tipos.

---

## §3. FASE 3 — Épica 3: Simulación de licitaciones en la proyección

**Meta:** Permitir al usuario simular "¿qué pasa con mi caja si me adjudico esta
licitación?" inyectando un ingreso probable (A/R fantasma) en la fecha estimada de pago.

### Tarea 3.1 — Extender el motor de proyección
- **Archivo a modificar:** `src/lib/projection.ts`.
- Nuevo tipo:
  ```ts
  export interface SimulatedBid {
    id: string;
    amount: number;        // monto esperado del contrato
    payDate: string;       // fecha estimada de pago estatal (YYYY-MM-DD)
    probability: number;   // 0–100
  }
  ```
- Nueva firma opcional (aditiva, no rompe llamadas actuales):
  `buildDailyProjection(currentCash, invoices, today, horizonDays, recurringTxs=[], taxRate=0, bids: SimulatedBid[] = [])`
- Dentro del bucle de deltas: por cada bid dentro del horizonte,
  `deltas[idx] += bid.amount * (bid.probability/100) * inFactor` (aplicando reserva de
  impuesto igual que los A/R, para coherencia con la Caja Restringida existente).
- Devolver además una **serie separada** de "sólo simulación" para poder graficarla como
  capa distinta (línea punteada violeta) sin ensuciar el balance base.

### Tarea 3.2 — UI de simulación
- Un panel/lista "Oportunidades" (al inicio con alta manual: monto, fecha, probabilidad).
- Toggle **"Simular en flujo de caja"** por oportunidad → agrega/quita el `SimulatedBid`.
- Los bids activos viven en estado de cliente (zustand, patrón `src/store/*`) — **no
  requieren backend en esta fase**. Persistencia opcional se evalúa en Fase 2.
- **Gráfico** (`src/components/CashflowChart.tsx`, usa Recharts): añadir una `<Line>`
  punteada con color semántico de simulación (violeta) para la curva "con licitación".

### Tarea 3.3 — Alerta de capital de trabajo
- Si la curva base + simulación cruza bajo el mínimo aceptable (o bajo 0) antes de la
  fecha de pago, mostrar banner: *"Adjudicarte esta licitación requiere ~$X de capital de
  trabajo en la semana Y por el desfase de pago estatal."*
- Cálculo: mínimo de la serie proyectada entre hoy y `payDate`; si `< umbral`, reportar el
  déficit y la fecha del valle.

### Criterios de aceptación Fase 3
- [ ] Activar el toggle inyecta un ingreso ponderado por probabilidad en `payDate`.
- [ ] El gráfico muestra la curva simulada como capa visual distinta.
- [ ] Desactivar el toggle revierte la proyección exactamente al estado base.
- [ ] La firma nueva de `buildDailyProjection` no rompe ninguna llamada existente.

---

## §4. FASE 2 — Épica 2: Integración con Mercado Público / Compra Ágil

> ⚠️ **Bloqueante:** requiere el repo/entorno de Edge Functions (no está en este working
> tree) y decisiones de custodia de secretos (§D4). No empezar hasta resolver §D1/§D4.

### Tarea 2.1 — Columna de credenciales del tenant
- **DDL (protocolo manual, NO `db push`):**
  ```sql
  alter table cashflow.tenant
    add column if not exists chilecompra_ticket text;  -- ver §D4: ¿Vault en vez de columna plana?
  alter table cashflow.tenant
    add column if not exists chilecompra_keywords text[] default '{}';
  ```
- UI en `src/components/TenantSettings.tsx`: input de ticket (enmascarado tras guardar) +
  editor de keywords. Guardado vía Edge Function `cashflow-tenant-settings` (extender su
  contrato — repo externo).

### Tarea 2.2 — Edge Function `cashflow-chilecompra` (repo externo de funciones)
- Consume `api.mercadopublico.cl` (licitaciones, ticket en query) y
  `api2.mercadopublico.cl` (Compra Ágil, ticket en header).
- Consolida ambas fuentes en un JSON único.
- Maneja `401` (ticket expirado) y `429` (rate limit) con mensajes claros al frontend.
- **El ticket nunca sale al cliente**: la función lo lee server-side del tenant.

### Tarea 2.3 — Vista "Oportunidades de Licitación"
- Nueva sección en Workspace/Dashboard: tabla con Código, Institución, Monto estimado,
  Fecha de cierre, enlace al portal. Filtro Licitación / Compra Ágil.
- Botón por fila **"Simular en flujo de caja"** → crea un `SimulatedBid` (enlaza con Fase 3).

---

## §5. FASE 4 — Épica 4: Automatización (pg_cron)

> Depende de Fase 2. Requiere `pg_cron` y aplicar DDL por el protocolo manual.

- **Tabla nueva** `cashflow.monitored_bids` (`owner_id`, `tenant_id`, `bid_code` UNIQUE por
  tenant, institución, monto, fecha_cierre, `matched_keyword`, `created_at`) con RLS plana.
- **Cron** en `cron.job` que invoca una función de chequeo semanal; deduplica por
  `bid_code` para no re-alertar el mismo ítem.
- **DDL aplicado manualmente** (SQL Editor + insert de versión en
  `supabase_migrations.schema_migrations`), nunca `supabase db push`.

---

## §6. Modelo de datos — resumen de cambios (todos por protocolo manual)

| Fase | Objeto | Cambio |
| :--- | :--- | :--- |
| 1 | `source_system` | +valor `SII_TIMBRE_LOCAL` (§D1) |
| 2 | `cashflow.tenant` | +`chilecompra_ticket`, +`chilecompra_keywords[]` |
| 4 | `cashflow.monitored_bids` | tabla nueva + RLS + índice único por `(tenant_id, bid_code)` |

---

## §7. Decisiones

### Resueltas (2026-07-14) — Fase 1 desbloqueada

- **§D1 — `source_system` para timbre → RESUELTA: mapear a `MANUAL`.** Las facturas
  leídas por timbre se guardan como `MANUAL` (sin cambios de BD ni de la Edge Function
  externa). No se agrega `SII_TIMBRE_LOCAL` en esta fase. Consecuencia: la métrica de
  "ahorro de IA" se difiere; el enganche en Tarea 1.3 usa `setSource('MANUAL')` y el badge
  verde es puramente informativo en cliente. **Tarea 1.4 queda anulada en Fase 1.**
- **§D2 — Dirección A/R vs A/P → RESUELTA: default + confirmación del usuario.** No se
  agrega RUT al tenant (confirmado: `cashflow.tenant` no tiene columna de RUT). El timbre
  pre-llena `type = 'AR'` por default y el usuario ajusta el selector antes de guardar
  (patrón "revisar antes de guardar" ya existente). Cero cambios de BD.
- **§D3 — Formatos → RESUELTA: solo PDF en Fase 1.** El lector rechaza imágenes; fotos de
  boletas térmicas quedan como iteración futura. `scanPdf417` solo maneja la rama PDF y el
  `accept` del input se mantiene en `application/pdf`.

### Pendientes (para Fases 2 y 4)

- **§D4 — Custodia del ticket ChileCompra:** ¿columna de texto plano, o Supabase Vault?
  *Recomendación:* Vault (o al menos cifrado + RLS estricto); es un secreto por-tenant.
- **§D5 — Repo de Edge Functions:** ¿dónde vive el código de `cashflow-*`? Fases 2 y 4 lo
  necesitan. Sin acceso a ese repo, esas fases quedan bloqueadas.

### Deuda menor detectada

- `src/lib/database.types.ts` está **desactualizado**: no refleja `tenant.business_model`
  ni `tenant.ppm_rate` (agregados en la migración `20260624120000`). Regenerar con
  `npm run gen:types` en algún momento (no bloquea Fase 1).

---

## §8. Estimación y orden de ejecución sugerido

| Orden | Fase | Esfuerzo | Backend | Secretos | Bloqueantes |
| :---: | :--- | :---: | :---: | :---: | :--- |
| 1 | §2 Épica 1 (TED) | 2-3 d | No | No | §D1, §D2, §D3 |
| 2 | §3 Épica 3 (Forecast) | 2-3 d | No | No | — (alta manual) |
| 3 | §4 Épica 2 (ChileCompra) | 3-4 d | Sí | Sí | §D4, §D5 |
| 4 | §5 Épica 4 (Cron) | 1-2 d | Sí | Sí | Fase 2 completa |

**Camino crítico sin dependencias externas:** Fases 1 + 3 (~1 semana) entregan el ahorro
de tokens y el gancho de valor de forecasting **sin** tocar Edge Functions ni secretos.
Fases 2 + 4 se abordan cuando se resuelvan §D4 y §D5.
