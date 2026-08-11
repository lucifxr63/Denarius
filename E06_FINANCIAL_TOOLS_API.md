# E06 — API de herramientas financieras read-only

## Estado

Versión read-only de siete herramientas desplegada y certificada como Edge
Function `denarius-tools`.

## Decisiones

- El tenant se resuelve desde la sesión en el servidor y no forma parte de los
  argumentos controlables por el modelo.
- Todas las respuestas incluyen versión, tenant, `as_of`, moneda, confianza y
  fuentes.
- El catálogo inicial contiene solo lecturas.
- Horizontes de proyección permitidos: 30, 90 y 365 días.
- El dispatcher depende de un provider; Supabase será un adaptador, no una
  dependencia del contrato del agente.
- La proyección server-side conserva el modelo asimétrico, expande recurrencias y
  aplica `tenant.default_tax_rate` a ingresos proyectados.

## Herramientas desplegadas

- `get_cash_position`
- `get_runway_and_burn`
- `list_overdue_invoices`
- `get_cash_projection`
- `get_restricted_cash`
- `explain_metric`
- `get_financial_summary`

## Implementado

- Adaptador Supabase con anon key + JWT explícito del usuario.
- Tenant resuelto server-side bajo RLS.
- Endpoint `POST /functions/v1/denarius-tools`, JWT obligatorio.
- CORS para Denarius, Vercel y desarrollo local.
- Validación de catálogo, argumentos y horizontes.
- Certificación E2E de cero huella para las cuatro herramientas.
- Smoke de CORS y rechazo sin JWT.
- JSON Schema cerrado para las siete herramientas.
- Rate limiting por usuario/tenant: 30 invocaciones por minuto.
- Auditoria de herramienta, estado y latencia, sin payload financiero.
- Certificacion E2E de cero huella para las siete herramientas.
- Evaluacion automatizada del alcance de las doce preguntas doradas.

## Próxima implementación

1. `explain_projection_point` para explicar eventos del saldo mínimo.
2. `simulate_scenario` estrictamente no persistente.
3. Orquestador conversacional que seleccione herramientas por intención.
4. Historial de conversaciones con retención y consentimiento definidos.
5. Pruebas de carga y alertas operacionales sobre errores y rate limiting.

## No aceptado

- Service role en cliente o en contexto del modelo.
- `tenant_id` indicado libremente por el LLM.
- Respuestas financieras sin fecha de corte o fuentes.
- Escrituras dentro de este endpoint.
