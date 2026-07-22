# Resumen de la Integración Luca → Denarius (para revisión)

> Documento de contexto para el dueño del repositorio. Explica **qué se
> implementó, por qué, cómo se validó y qué queda pendiente**. El detalle técnico
> está en `LUCA_INTEGRATION_PLAN.md` (plan completo) y `LUCA_FASE4_BACKEND_SPEC.md`
> (backend futuro). Todo el código viene en el Pull Request asociado.

---

## 1. Qué es esto

Se tomaron tres funcionalidades de la app **Luca** y se adaptaron a Denarius
(React + Supabase). Las tres son **100% frontend**: no tocan la base de datos, no
requieren nuevas credenciales de servidor ni modifican las Edge Functions
existentes. Por eso son **seguras de revisar y mergear** sin coordinar cambios de
infraestructura.

| Fase | Qué hace | Valor para la PYME |
| :--- | :--- | :--- |
| **1. Timbre SII** | Lee el código de barras (PDF417) de facturas/boletas chilenas y rellena el formulario solo. | Ahorra tiempo y **$0 en costo de IA** para documentos tributarios estándar. |
| **3. Simulación de licitaciones** | Permite simular "¿qué pasa con mi caja si me gano este contrato?" en la proyección. | Responde *"¿cuánto dinero tendré?"* y anticipa necesidades de capital de trabajo. |
| **2. Monitoreo Mercado Público** | Busca licitaciones activas de ChileCompra por palabras clave y las conecta con la simulación. | Descubre oportunidades de venta al Estado sin salir de Denarius. |

Las tres se encadenan: **Mercado Público** encuentra una licitación → un clic la
manda a la **Simulación** → se ve el impacto en la **proyección de caja**.

---

## 2. Cómo probarlo (5 minutos)

Con el proyecto corriendo (`npm install && npm run dev`), en el Dashboard:

**Fase 1 — Timbre SII**
1. En "Nueva factura", sube el **PDF digital** de una factura electrónica chilena.
2. Si trae timbre, aparece un **badge verde** "Leído del Timbre SII" y el formulario
   queda relleno, sin gastar cuota de IA.
3. Si es una foto borrosa o un PDF sin timbre, cae automáticamente al lector con IA
   que ya existía (nada se rompe).

**Fase 3 — Simulación**
1. En el panel "Oportunidades de Licitación", agrega una manualmente (monto,
   probabilidad, fecha de pago estimada).
2. Con el toggle activo, aparece una **línea punteada violeta** en el gráfico de
   proyección mostrando la caja "si te adjudicas el contrato".
3. Si la caja base cae bajo cero antes del pago, sale un **aviso de capital de
   trabajo**.

**Fase 2 — Mercado Público**
1. En el panel "Mercado Público" → "Configurar", pega tu **ticket de ChileCompra**
   (se obtiene gratis en api.mercadopublico.cl) y palabras clave.
2. "Buscar" lista licitaciones activas que coincidan.
3. "Simular en flujo de caja" en cualquiera la manda al simulador de la Fase 3.

---

## 3. Cómo se validó (calidad)

- **Pruebas automatizadas:** se agregó **Vitest** (`npm test`) — **54 pruebas
  verdes** que cubren el parser del timbre, el motor de proyección con simulación,
  y la lógica de ChileCompra.
- **Timbre SII validado con un DTE real:** se decodificó y parseó correctamente un
  timbre real del **Manual de Muestras Impresas oficial del SII** (firma RSA
  genuina) → 8/8 campos correctos. Además se confirmó en el navegador con el badge
  verde y sin consumo de IA.
- **Compilación limpia:** `npm run build` (chequeo de tipos + build de producción)
  pasa sin errores.

---

## 4. Decisiones de diseño relevantes

- **El timbre se guarda como `MANUAL`** (no se agregó un tipo nuevo a la base de
  datos) para no tocar la Edge Function `cashflow-invoices` que vive fuera de este
  repo. Se puede refinar después.
- **Solo PDF digital** para el timbre en esta fase: en fotos de celular el código
  PDF417 es demasiado frágil (se comprobó con una foto real → cae a IA, que es lo
  correcto).
- **Fase 2 como MVP client-side:** la API de Mercado Público tiene CORS abierto
  (verificado), así que el navegador la llama directo. El "ticket" es una clave de
  **solo lectura de datos públicos** (bajo riesgo). Para producción se recomienda
  moverlo a una Edge Function — documentado en `LUCA_FASE4_BACKEND_SPEC.md`.

---

## 5. Qué queda pendiente (no incluido en este PR)

1. **Validar la búsqueda de ChileCompra en vivo** con un ticket real (el ticket
   público de pruebas está saturado; la lógica de parseo sí está probada).
2. **Fase 4 — Automatización (cron):** buscar oportunidades en segundo plano y
   guardarlas. Requiere acceso al repo de Edge Functions. **Ya está especificada**
   (DDL, funciones y schedule) en `LUCA_FASE4_BACKEND_SPEC.md`, lista para ejecutar.
3. **Endurecer el ticket a server-side** (Supabase Vault + Edge Function proxy),
   también especificado en ese documento.

---

## 6. Archivos principales del PR

**Nuevos**
- `src/lib/ted.ts`, `src/lib/pdf417.ts` — lectura del timbre.
- `src/lib/projection` (extendido) — simulación de licitaciones.
- `src/lib/chilecompra.ts`, `src/lib/chilecompra.client.ts` — Mercado Público.
- `src/store/useBidsStore.ts`, `src/store/useChileCompraStore.ts` — estado local.
- `src/components/BidsPanel.tsx`, `src/components/ChileCompraPanel.tsx` — paneles.
- `src/lib/*.test.ts` — 54 pruebas.
- `LUCA_INTEGRATION_PLAN.md`, `LUCA_FASE4_BACKEND_SPEC.md` — documentación.

**Modificados**
- `src/components/InvoiceForm.tsx` — engancha el timbre antes de la IA.
- `src/components/CashflowChart.tsx` — curva simulada.
- `src/pages/Dashboard.tsx` — cablea los paneles nuevos.
- `package.json` — dependencias del timbre (`@zxing/library`, `pdfjs-dist`) y Vitest.

---

*Generado con Claude Code. Las Fases 1–3 están listas para revisión; la Fase 4
queda documentada para ejecutarse cuando haya acceso al repo de Edge Functions.*
