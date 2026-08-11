# DEN-125 · MCP operativo con permisos para Claude

## Contrato de scopes
- `financial:read`: caja, proyección, burn, runway y vencimientos.
- `alerts:read`: alertas y evidencia.
- `operations:write`: crear movimientos y facturas; requiere aprobación del cliente.
- `actions:write`: crear, asignar y actualizar acciones.
- `close:prepare`: preparar un cierre sin persistirlo.
- `close:approve`: confirmar el cierre con confirmación explícita.
- `team:manage` y `mcp:manage`: nunca se conceden por defecto.

## Reglas
- Intersección entre scopes de clave, plantilla del usuario y herramienta.
- Ninguna herramienta puede elegir otro tenant.
- Lecturas y simulaciones no mutan estado.
- Escrituras son idempotentes y auditadas.
- Eliminaciones, cierres y cambios de acceso exigen confirmación reforzada.
- El monitor de alertas pertenece a Denarius; Claude actúa durante una conversación autorizada.

## Incrementos
1. Selector de scopes y consentimiento.
2. Herramientas de acciones y operaciones.
3. Preparación y aprobación separadas para cierres.
4. Monitor programado, bandeja y notificaciones.
5. Certificación de aislamiento, rate limits, revocación y rollback.
