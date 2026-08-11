# CLAUDE.md

Guía operativa para agentes en este repo. Para el detalle de producto/arquitectura,
la fuente canónica es **[DENARIUS.md](DENARIUS.md)** (y su anexo de esquema
[ARCHITECTURE.md](ARCHITECTURE.md)). Este archivo resume lo imprescindible y las
reglas que **no** se deben romper.

## Qué es

**Denarius** (ex *Cashflow*) — SaaS de flujo de caja en tiempo real para PYMEs y
startups de LatAm. Responde: *"¿cuánta caja tengo hoy y cuándo me quedo sin?"*.
Producto hermano de **Validus**; comparten el mismo proyecto Supabase
(`fcdhcntyvsydnvjwopfe`) pero Denarius vive aislado en el esquema `cashflow`.
**Estado: en producción.**

> **Marca vs. código:** "Denarius" es solo el nombre visible (UI, dominio). A nivel
> de código e infra el identificador sigue siendo `cashflow` (esquema, Edge
> Functions `cashflow-*`, bucket `cashflow_docs`, proyecto Vercel `cashflow`).
> No renombrar identificadores sin decisión explícita.

## Stack

React 19 + TypeScript + Vite 6 · Tailwind v4 (`@theme inline`, dark/light) ·
Zustand · React Router 7 · Recharts 3 · React Hook Form + Zod · Sonner ·
lucide-react. Backend: Supabase (Postgres + Auth + Storage + Edge Functions Deno).
Deploy: Vercel (SPA estática). Patrón: **SPA + BaaS, sin servidor monolítico.**

## Comandos

```bash
npm install
npm run dev        # Vite en localhost:5174 (strictPort — ver abajo)
npm run build      # tsc --noEmit && vite build
npm run preview    # sirve dist/
npm run gen:types  # regenera src/lib/database.types.ts desde el esquema cashflow
```

No hay suite de tests unitarios. La certificación e2e del lente SaaS es
`launch/integration-test-saas.mjs` (protocolo de cero huella).

## Estructura (`src/`)

- `pages/` — `Landing`, `Login`, `Dashboard` (núcleo), `SaasCashflow` (`/saas`),
  `Workspace` (`/workspace`).
- `components/` — UI; `components/dashboard/` es el **Canvas config-driven**
  (`DashboardCanvas`, `slotContract`, `widgets`); `components/ui/` primitivas.
- `hooks/` — `useCashflow`, `useCashflowAnalytics`, `useCashflowExtra`,
  `useDashboardDataOrchestrator` (puente Supabase ↔ store).
- `lib/` — `supabase`, `queries`, `projection` (motor local), `auth`, `utils`,
  `database.types` (generado).
- `store/` — Zustand: `auth`, `theme`, `useDashboardData`, `useWorkspaceStore`.
- `config/dashboards/` — layouts JSON por modelo de negocio (`pyme-tradicional`,
  `startup-saas`) mapeados en `index.ts` contra el contrato `types.ts`.

Las **Edge Functions NO viven aquí**: están en
`validateai/supabase/functions/cashflow-*` (proyecto Supabase compartido).

## El motor de proyección (`lib/projection.ts`) — corazón del producto

Construye la serie diaria de "Saldo Disponible Real" en el **cliente** (no persiste
nada) y deriva KPIs (Caja actual, Burn mensual, Runway, Saldo mínimo proyectado,
Caja Restringida). Reglas clave:

- **A/P vencida** → se mueve a HOY (peor escenario). **A/R vencida** → NO se proyecta,
  va al Centro de Resolución (acción manual).
- `recurring_transaction` **no genera filas futuras**: `phantomEvents()` las expande
  al vuelo dentro del horizonte. El usuario carga su nómina/arriendo una sola vez.
- Reserva de impuestos: ingresos entran netos (`amount * (1 - taxRate/100)`); el %
  reservado se expone como Caja Restringida.
- Simulador What-If: el Dashboard mantiene un `Set` de IDs ocultos; la proyección
  los excluye sin tocar datos.

## Reglas que NO se rompen

1. **RLS plano (presupuesto < 50 ms):** prohibido JOIN/subconsultas en políticas RLS.
   Se desnormaliza `owner_id = auth.uid()` en toda tabla tenant-scoped; política
   `using/with check (owner_id = (select auth.uid()))`. El cliente **inyecta
   `owner_id` en cada INSERT** (lo exige el `WITH CHECK`; omitirlo → error 42501).
2. **Migraciones:** ⚠️ el tracking remoto está roto. **Nunca `supabase db push`.**
   Aplicar cada migración vía SQL Editor / Management API y registrar la versión en
   `supabase_migrations.schema_migrations`. Las migraciones de cashflow **nunca**
   tocan `public` (donde vive Validus).
3. **Proyecto Supabase compartido con Validus:** cuidado con `site_url`, allowlist de
   Redirect URLs y CORS — un cambio mal hecho **rompe Validus**. Todo dominio nuevo
   debe ir a la allowlist de Auth y a `ALLOWED_ORIGINS` en `_shared/cors.ts` (con
   redeploy de las funciones `cashflow-*`).
4. **Dev en puerto 5174 con `strictPort`:** no cambiarlo. Otro puerto rompe el OAuth
   (su `redirect_to` no estaría en la allowlist y caería al site_url de Validus).
5. **Edge Functions** devuelven **JSON puro** y validan la sesión (`getUser`) operando
   con el JWT del usuario para que la RLS acote los datos.
6. **Friction Check** antes de cada feature: viabilidad técnica · impacto UX · costo/
   mantenibilidad. Preferir siempre la solución más simple que valide el negocio.

## Theming

Tailwind v4: `@custom-variant dark (&:where(.dark, .dark *))` — el modo se controla
con la clase `.dark` en `<html>` (override manual persistente, no `prefers-color-scheme`
directo). Tokens crudos en `:root`/`.dark`, mapeados con `@theme inline`. La fuente de
verdad de los tokens es `src/index.css`; los artefactos de `design/stitch/` son solo
referencia. Recharts lee el tema resuelto (no consume utilidades Tailwind).
Semántica: esmeralda = positivo/CTA · violeta = tech/simulación · rojo = negativo/
vencido · ámbar = caja restringida.

## Sincronización del código (subtree)

Este repo (`lucifxr63/Denarius`) es la **fuente de verdad**. La misma base vive como
subcarpeta `cashflow/` del monorepo `lucifxr63/stars` vía `git subtree`. **Editar solo
acá** y reflejar en stars con `subtree pull`. Detalle en [SYNC.md](SYNC.md).

## Variables de entorno (`.env.local`, no commitear)

`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (cliente) ·
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN` (solo server/scripts/deploy) ·
`VITE_POSTHOG_HOST` (opcional). `.env.local` está gitignored y **no viaja** por subtree.
