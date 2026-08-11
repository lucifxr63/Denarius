# Auditoría remota de Denarius — 2026-08-06

## Alcance y método

Auditoría no destructiva contra el proyecto Supabase `fcdhcntyvsydnvjwopfe`.
No se consultaron filas, no se ejecutaron RPC, migraciones, cron ni despliegues.

Métodos utilizados:

- contrato OpenAPI del esquema `cashflow` autenticado con credencial server-side;
- preflight `OPTIONS` de Edge Functions;
- solicitudes sin JWT incluidas en `launch/smoke-test.mjs`;
- comparación con migración y tipos TypeScript locales.

## Resultado

### Base de datos confirmada

Tablas expuestas y presentes:

- `tenant`, `bank_account`, `transaction`, `invoice`;
- `recurring_transaction`, `profiles`, `pdf_usage`;
- `partner_contributions`, `expense`, `revenue`.

RPC presentes:

- `check_and_increment_pdf_usage`;
- `fmt_clp_short`;
- `metrics_pyme`;
- `metrics_saas`.

Columnas nuevas confirmadas en `tenant`:

- `business_model`;
- `ppm_rate`.

### Edge Functions confirmadas como alcanzables

| Función | OPTIONS | CORS Denarius | Observación |
|---|---:|---:|---|
| `cashflow-invoices` | 200 | Sí | Sin JWT devuelve 401 |
| `cashflow-recurring` | 200 | Sí | Preflight correcto |
| `cashflow-parse-pdf` | 200 | Sí | Sin JWT devuelve 401 |
| `cashflow-tenant-settings` | 200 | Sí | Preflight correcto |
| `cashflow-analytics` | 200 | Sí | Preflight correcto |
| `cashflow-weekly-cron` | 401 | No | No se invocó; no parece destinado al navegador |
| `denarius-tools` | 204 | Sí | JWT obligatorio; cuatro lecturas certificadas |

### API de herramientas financieras

`denarius-tools` fue desplegada y certificada con un usuario temporal:

- `get_cash_position`;
- `get_runway_and_burn`;
- `list_overdue_invoices`;
- `get_cash_projection`.

Todas las respuestas incluyeron tenant de sesión, fecha de corte, moneda y fuentes.
El endpoint rechazó un `tenant_id` enviado por el solicitante y el cleanup terminó
sin huella. La proyección aplica vencimientos asimétricos, recurrencias y reserva
tributaria.

La consulta administrativa confirmó las versiones desplegadas:

| Función | Versión | Estado | verify_jwt |
|---|---:|---|---:|
| `cashflow-invoices` | 15 | ACTIVE | true |
| `cashflow-recurring` | 15 | ACTIVE | true |
| `cashflow-parse-pdf` | 16 | ACTIVE | true |
| `cashflow-tenant-settings` | 11 | ACTIVE | true |
| `cashflow-analytics` | 11 | ACTIVE | true |
| `cashflow-weekly-cron` | 7 | ACTIVE | false |

### RLS y RPC certificadas por catálogo SQL

- RLS está habilitada en las diez tablas del esquema `cashflow`.
- Las tablas tenant-scoped aplican políticas planas `owner_id = auth.uid()` tanto
  en `USING` como en `WITH CHECK`.
- `profiles` utiliza `id = auth.uid()` para SELECT/UPDATE.
- `metrics_pyme` y `metrics_saas` no son `SECURITY DEFINER`, fijan
  `search_path=cashflow, public` y sus cuerpos contienen controles de `auth.uid()`
  y `owner_id`.
- `check_and_increment_pdf_usage` sí es `SECURITY DEFINER`, fija `search_path` y
  controla `auth.uid()`/`owner_id`.
- Se detectó `EXECUTE` para `anon` en las cuatro funciones. La migración
  `20260806210000_cashflow_rpc_execute_hardening` fue aplicada y verificada:
  `anon_execute=false`, `authenticated_execute=true` y
  `service_role_execute=true` en todas ellas.

### Historial de migraciones

El historial remoto sí contiene la fundación de Denarius:

- `20260627000000 cashflow_foundation`;
- `20260628000000 cashflow_prd_remodel`;
- `20260629000000 cashflow_recurring_expense`;
- `20260630000000 cashflow_pdf_ingest`;
- `20260701000000 cashflow_pdf_quota`;
- `20260702000000 cashflow_recurring_transaction`;
- `20260703000000 cashflow_tenant_settings`;
- `20260704000000 cashflow_partner_revenue_expense`.

La migración local `20260624120000_cashflow_business_model_and_read_rpcs` no estaba
registrada, aunque sus objetos existían. Se ejecutó una reconciliación condicionada
que validó columnas, constraints, índices y firmas antes de insertar la versión. El
historial remoto contiene ahora `20260624120000` y `20260806210000`.

### Certificación dinámica de RLS y analytics

La suite `launch/integration-test-saas.mjs` finalizó completamente en verde:

- creó dos usuarios temporales y confirmó sus tenants;
- insertó aporte, gasto e ingreso mediante RLS;
- rechazó con `42501` un INSERT con el `owner_id` del segundo usuario;
- certificó el contrato y los totales de `cashflow-analytics`;
- comprobó que el segundo usuario no veía datos financieros del primero;
- eliminó ambos usuarios y sus filas mediante cascade.

La suite general confirmó cuentas, balance por trigger, facturas, recurrencias,
aislamiento cross-tenant, cuota PDF, aceptación de factura y rechazo de cotización.
Se añadió timeout abortable de 45 segundos por llamada y limpieza explícita de
Storage. La suite finalizó en verde y eliminó ambos usuarios.

### Divergencias detectadas y tratadas

1. `database.types.ts` no reflejaba las columnas ni las tres RPC de la migración.
   Se sincronizó manualmente contra el contrato remoto.
2. `useDashboardMetricsPayload` usaba una aserción de tipo para invocar RPC.
   Se eliminó y ahora usa el cliente Supabase tipado.
3. El token administrativo fue renovado y permite inventario/consultas de catálogo.
4. La CLI aún no está linked, pero el tracking se auditó y reconcilió mediante el
   endpoint administrativo con precondiciones SQL.
5. El smoke test fue actualizado a `https://denarius.scouttech.lat`; disponibilidad,
   rewrite SPA, CORS de cinco funciones y JWT finalizaron en verde.

## Aún no certificado

- Contenido exacto y versión desplegada de cada Edge Function.
- Configuración de Auth, Redirect URLs, Storage y secretos.

Estas comprobaciones requieren renovar el token de administración o acceso SQL de
solo lectura. No se aceptará inferirlas desde documentación histórica.

## Reproducción

```bash
npm run audit:remote
node launch/smoke-test.mjs
```

El primer comando inspecciona metadatos y preflight. El segundo prueba disponibilidad,
CORS y barrera JWT sin crear datos.
