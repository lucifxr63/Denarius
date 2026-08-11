# Denarius MCP — producto y contrato vigente

> Verificado el 2026-08-11. MCP significa **Model Context Protocol**; no MSP. La publicación en npm está postergada hasta después de la beta cerrada.

## Función

Denarius MCP permite que Claude u otro cliente autorizado consulte el contexto financiero de una compañía y ayude a gestionar su plan de acción. El servidor resuelve usuario, compañía y permisos; Denarius conserva la fuente de verdad, la interfaz visual y el historial.

## Transporte, autenticación y scopes

- MCP HTTP/JSON-RPC, versión `2025-11-25`.
- OAuth para el conector remoto de Claude, con consentimiento por compañía.
- API keys `dnr_live_` para el puente `stdio` desktop; secreto visible una sola vez, hash en servidor, expiración, rotación y revocación.
- `financial:read`: métricas, proyección, facturas, planes y resultados.
- `alerts:read`: alertas accionables.
- `actions:write`: crear y actualizar acciones; requiere aprobación explícita en el cliente.

El cliente nunca envía ni selecciona `tenant_id`. Cambiar de empresa se realiza en Denarius y genera un contexto/grant correspondiente.

## Catálogo de 14 herramientas

| Herramienta | Resultado | Scope |
|---|---|---|
| `get_cash_position` | Caja actual, restringida y disponible | `financial:read` |
| `get_runway_and_burn` | Burn mensual y runway | `financial:read` |
| `list_overdue_invoices` | Cuentas por cobrar vencidas | `financial:read` |
| `get_cash_projection` | Proyección a 30, 90 o 365 días | `financial:read` |
| `get_restricted_cash` | Reserva tributaria estimada | `financial:read` |
| `explain_metric` | Valor, fórmula, corte y fuentes | `financial:read` |
| `get_financial_summary` | Resumen de caja, burn, runway, MRR y mora | `financial:read` |
| `explain_projection_point` | Eventos que explican un punto proyectado | `financial:read` |
| `simulate_scenario` | Escenario no persistido sobre cobranza | `financial:read` |
| `get_weekly_action_plan` | Acciones, responsables, fechas e impacto | `financial:read` |
| `get_weekly_action_outcome` | Plan anterior frente al resultado real | `financial:read` |
| `get_actionable_alerts` | Alertas vigentes priorizadas | `alerts:read` |
| `create_financial_action` | Nueva acción financiera trazable | `actions:write` |
| `update_financial_action_status` | Cambio de estado de una acción | `actions:write` |

Las métricas explicables incluyen `current_cash`, `restricted_cash`, `working_capital`, `burn_rate`, `runway` y `mrr`.

## Garantías

1. El gateway valida credencial/grant, compañía, membresía y scopes.
2. Las consultas se filtran por compañía resuelta en servidor.
3. Cada respuesta financiera declara versión, fecha de corte, moneda, confianza y fuentes.
4. Una fuente fallida produce error; el MCP no inventa cifras ni recurre a mocks.
5. Las simulaciones se etiquetan como no persistidas.
6. Las escrituras necesitan `actions:write`, permiso Denarius y aprobación humana.
7. La auditoría registra herramienta, estado y latencia, pero no preguntas, argumentos, respuestas, montos ni secretos.
8. La revocación bloquea nuevas ejecuciones sin afectar la identidad compartida de otros productos.

## Fuera de alcance

El MCP no ejecuta pagos o transferencias, no presenta impuestos, no borra contabilidad, no cambia permisos/equipo y no modifica datos de Validus, Licitus o Animus. El chatbot tampoco reemplaza la aplicación Denarius.

## Cliente desktop y npm

El puente `mcp-desktop/` requiere Node.js 20+ y una API key. No contiene `service_role` y solo adapta el transporte `stdio` al servidor. No se debe anunciar `npx denarius-mcp` hasta completar ownership del paquete, instalación limpia multiplataforma, certificación con clientes, firma/release, auditoría de dependencias y rollback.

## Próximos incrementos

- Operar pilotos y medir activación, utilidad de respuestas, uso de alertas y acciones completadas.
- Añadir conectores de datos manteniendo procedencia y frescura.
- Mejorar propuestas conversacionales con preview, idempotencia y comprobante.
- Certificar y publicar el puente desktop cuando la puerta npm esté completa.
- Mantener pruebas continuas de aislamiento, scopes, revocación y preguntas doradas.

La certificación operativa vigente está en [docs/certification/OPERATIONAL_GATE_2026-08-10.md](./docs/certification/OPERATIONAL_GATE_2026-08-10.md).
