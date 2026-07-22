# Spec de Backend — Fase 4 (Automatización) + Hardening server-side del ticket

> **Estado:** Documentación para ejecución futura. **NO implementar hasta desbloquear §D5.**
> **Bloqueante (§D5):** el código de las Edge Functions (`cashflow-*`) NO vive en este
> repo; se invoca desplegado (`supabase.functions.invoke(...)`). Esta fase requiere
> acceso a ese repo/entorno para crear las funciones nuevas.
> **Relacionado:** `LUCA_INTEGRATION_PLAN.md` (Épicas 2 y 4). Las Fases 1–3 ya están
> implementadas y en el PR; la Fase 2 quedó como **MVP client-side** (fetch desde el
> navegador). Este spec cubre (A) endurecer ese ticket a server-side y (B) el cron.

---

## ⚠️ Protocolo de migraciones (OBLIGATORIO — ver header de `supabase/migrations/20260624120000_*.sql`)

El tracking de migraciones está roto. Para TODO el DDL de este spec:
- **NUNCA** `supabase db push`.
- Aplicar el archivo **completo en una sola transacción** vía SQL Editor o el Management
  API query endpoint del proyecto `fcdhcntyvsydnvjwopfe`.
- Insertar la fila de versión en `supabase_migrations.schema_migrations` al final de la
  misma transacción.
- RLS **plana**: todo se filtra por `owner_id = auth.uid()`. Toda tabla nueva replica ese
  patrón (`owner_id` + `tenant_id` + policies).

---

## A. Hardening del ticket ChileCompra (server-side) — endurece la Fase 2

Hoy (MVP) el ticket vive en `localStorage` y el navegador llama directo a la API (CORS
abierto). Para producción, moverlo server-side:

### A.1 — Almacenamiento del ticket (§D4)

**Opción recomendada: Supabase Vault** (secreto cifrado, nunca expuesto al `anon` key).
Alternativa mínima: columna en `cashflow.tenant` (texto), aceptable solo si el acceso
está estrictamente acotado por RLS y el ticket se trata como dato de bajo riesgo.

```sql
-- DDL (protocolo manual). Alternativa "columna" — la de Vault no requiere esta tabla.
alter table cashflow.tenant
  add column if not exists chilecompra_ticket text;      -- considerar Vault en vez de plano
alter table cashflow.tenant
  add column if not exists chilecompra_keywords text[] not null default '{}';
```

### A.2 — Edge Function `cashflow-chilecompra` (Deno) — proxy server-side

Reemplaza el fetch client-side: el navegador llama a ESTA función (con su JWT), y la
función lee el ticket del tenant server-side y consulta Mercado Público. **El ticket
nunca sale al cliente.** Reutiliza la lógica pura ya existente y testeada en
`src/lib/chilecompra.ts` (portarla a Deno o compartirla).

```ts
// supabase/functions/cashflow-chilecompra/index.ts  (SKELETON)
import { createClient } from 'jsr:@supabase/supabase-js@2';
// Portar de src/lib/chilecompra.ts: buildLicitacionesUrl, parseLicitaciones, filterByKeywords.

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error_code: 'UNAUTHORIZED', message: 'No autenticado' }, 401);

  const { tenant_id } = await req.json();

  // RLS acota a los tenants del usuario. Leer ticket + keywords (o desde Vault).
  const { data: tenant } = await supabase
    .from('tenant').select('chilecompra_ticket, chilecompra_keywords')
    .eq('id', tenant_id).single();
  const ticket = tenant?.chilecompra_ticket;
  if (!ticket) return json({ error_code: 'NO_TICKET', message: 'Configura tu ticket' }, 400);

  const res = await fetch(buildLicitacionesUrl(ticket, { estado: 'activas' }));
  if (res.status === 401) return json({ error_code: 'TICKET_INVALID', message: 'Ticket inválido/expirado' }, 401);
  if (res.status === 429) return json({ error_code: 'RATE_LIMIT', message: 'Demasiadas peticiones' }, 429);

  const opps = filterByKeywords(parseLicitaciones(await res.json()), tenant.chilecompra_keywords ?? []);
  return json({ data: opps }, 200);
});

const json = (b: unknown, status: number) =>
  new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });
```

### A.3 — Cambio en el frontend (al migrar de MVP a server-side)

Reemplazar el fetch directo de `src/lib/chilecompra.client.ts` por una invocación
a la Edge Function; el store `useChileCompraStore` deja de guardar el ticket (pasa a
`cashflow-tenant-settings`). La lógica pura de `chilecompra.ts` y sus 15 tests se
mantienen (el parseo es el mismo, solo cambia quién hace el fetch).

```ts
// nuevo chilecompra.client.ts (server-side)
const { data, error } = await supabase.functions.invoke('cashflow-chilecompra', { body: { tenant_id } });
if (error) throw new Error(await extractMessage(error));  // patrón de queries.ts
return data.data as Opportunity[];
```

---

## B. Fase 4 — Automatización (pg_cron) + persistencia de oportunidades

### B.1 — Tabla `cashflow.monitored_bids` (DDL, protocolo manual)

```sql
create table if not exists cashflow.monitored_bids (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete cascade,
  tenant_id      uuid not null references cashflow.tenant(id) on delete cascade,
  source         text not null default 'licitacion',   -- 'licitacion' | 'compra-agil'
  bid_code       text not null,                          -- CodigoExterno
  name           text not null,
  organism       text,
  estimated_amount numeric,
  closing_date   date,
  matched_keyword text,
  created_at     timestamptz not null default now()
);

-- Dedup: un mismo código no se guarda dos veces por tenant (evita re-alertar).
create unique index if not exists uq_monitored_bids_tenant_code
  on cashflow.monitored_bids (tenant_id, bid_code);

-- Índice de lectura acotado a la RLS plana.
create index if not exists idx_monitored_bids_owner_created
  on cashflow.monitored_bids (owner_id, created_at desc);

-- RLS plana (owner_id = auth.uid()).
alter table cashflow.monitored_bids enable row level security;

create policy monitored_bids_select on cashflow.monitored_bids
  for select using (owner_id = auth.uid());
create policy monitored_bids_modify on cashflow.monitored_bids
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
```

### B.2 — Edge Function `cashflow-chilecompra-cron` (Deno) — chequeo desatendido

Corre para TODOS los tenants con ticket + keywords configurados; hace UPSERT
deduplicado por `(tenant_id, bid_code)`. Usa `service_role` (bypassa RLS) porque
corre sin usuario. **No expone datos entre tenants** (cada insert lleva su `owner_id`/
`tenant_id`).

```ts
// supabase/functions/cashflow-chilecompra-cron/index.ts  (SKELETON)
Deno.serve(async (req) => {
  // Verificar el header secreto del cron (evita invocación externa).
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return new Response('forbidden', { status: 403 });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: tenants } = await admin
    .from('tenant').select('id, owner_id, chilecompra_ticket, chilecompra_keywords')
    .not('chilecompra_ticket', 'is', null);

  for (const t of tenants ?? []) {
    const opps = filterByKeywords(parseLicitaciones(await (await fetch(buildLicitacionesUrl(t.chilecompra_ticket))).json()), t.chilecompra_keywords ?? []);
    if (opps.length === 0) continue;
    await admin.from('monitored_bids').upsert(
      opps.map((o) => ({
        owner_id: t.owner_id, tenant_id: t.id, source: o.source, bid_code: o.code,
        name: o.name, organism: o.organism, estimated_amount: o.estimatedAmount, closing_date: o.closingDate,
      })),
      { onConflict: 'tenant_id,bid_code', ignoreDuplicates: true },   // dedup
    );
    // (opcional) generar alerta / notificación por las oportunidades NUEVAS.
  }
  return new Response('ok');
});
```

### B.3 — Schedule con `pg_cron` + `pg_net` (DDL, protocolo manual)

Supabase corre `pg_cron` en Postgres; para invocar la Edge Function se usa
`net.http_post` (extensión `pg_net`). Ambas ya están disponibles en Supabase.

```sql
-- Extensiones (idempotente).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Semanal, lunes 08:00 UTC. Ajustar zona/frecuencia según necesidad.
select cron.schedule(
  'chilecompra-weekly',
  '0 8 * * 1',
  $$
    select net.http_post(
      url     := 'https://fcdhcntyvsydnvjwopfe.supabase.co/functions/v1/cashflow-chilecompra-cron',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', '<CRON_SECRET>'    -- mismo valor que el env de la función
      ),
      body    := '{}'::jsonb
    );
  $$
);

-- Para desprogramar: select cron.unschedule('chilecompra-weekly');
```

### B.4 — Frontend (consumir las oportunidades guardadas)

- Leer `cashflow.monitored_bids` (RLS filtra por owner) para poblar el panel
  "Mercado Público" con lo que el cron encontró (en vez de/además del fetch en vivo).
- El botón "Simular en flujo de caja" ya existe (Fase 3) — mapea `monitored_bids` →
  `Bid` igual que hoy con `Opportunity`.

---

## Checklist de ejecución (cuando §D5 se desbloquee)

- [ ] Acceso al repo/entorno de Edge Functions confirmado.
- [ ] Decisión §D4 tomada: Vault vs columna para el ticket.
- [ ] DDL A.1 aplicado (protocolo manual + fila de versión).
- [ ] Edge Function `cashflow-chilecompra` desplegada (proxy) + frontend migrado.
- [ ] DDL B.1 (`monitored_bids` + RLS + índices) aplicado.
- [ ] Edge Function `cashflow-chilecompra-cron` desplegada con `CRON_SECRET`.
- [ ] Schedule B.3 creado; verificar primera corrida en `cron.job_run_details`.
- [ ] Frontend consume `monitored_bids`.
- [ ] Validar la forma del cuerpo EXITOSO del API con un ticket real (pendiente de Fase 2).
