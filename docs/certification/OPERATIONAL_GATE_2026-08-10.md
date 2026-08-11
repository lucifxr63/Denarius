# Puerta operativa · 2026-08-10

## Veredicto

**GO OPERATIVO**

Comando reproducible: `npm run certify:operational-gate`

## Controles aprobados

- MCP OAuth y protocolo 2025-11-25: PASS.
- Catálogo de 14 herramientas condicionado por scopes: PASS.
- Aislamiento cross-tenant mediante API keys: PASS.
- Activación, auditoría por canal y salud agregada: PASS.
- Soporte beta, rechazo de PII y revocación urgente: PASS.
- Métricas de experiencia con esquema cerrado y agregados sin PII: PASS.
- Limpieza de todas las identidades temporales: PASS.

## Incidentes encontrados y resueltos

1. El gateway OAuth combinaba autorización de service role con `apikey` anónima. Se corrigió para reenviar una sola identidad interna coherente.
2. Las llamadas OAuth se clasificaban como `MCP_API_KEY`. La auditoría ahora usa la presencia real de `principalKeyId` para distinguir ambos canales.
3. Se actualizaron certificaciones antiguas para incorporar consentimiento OAuth, 14 herramientas y errores JSON-RPC válidos.

## Límites

Este documento acredita la preparación operativa. La decisión consolidada se encuentra en `GO_NO_GO_BETA_2026-08-11.md`.
