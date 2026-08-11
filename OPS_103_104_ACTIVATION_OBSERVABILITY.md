# OPS-103/104 · Activación y observabilidad por release

## Activación

El embudo se deriva de fuentes canónicas: `financial_onboarding_completed_at`, primera API key y primera fila `SUCCESS` de `agent_tool_audit`. No se duplican eventos. Una empresa queda activada al completar su primera proyección y su primera consulta MCP.

## Observabilidad

Cada ejecución de herramienta registra únicamente herramienta, estado, latencia, canal, release, identificadores internos y fecha. Está prohibido almacenar preguntas, argumentos, respuestas, montos, nombres, correos o secretos.

`release_health` está reservado a `service_role` y entrega volumen, error rate, rate limiting, p95 de latencia y distribución por canal para una versión.

## Alarmas recomendadas

- Error rate superior a 5% durante 15 minutos.
- p95 superior a 2 segundos durante 15 minutos.
- Más de 10% de solicitudes limitadas durante 5 minutos.
- Caída a cero solicitudes comparada con la misma ventana del día anterior.
