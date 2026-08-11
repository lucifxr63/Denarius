# E10 — Denarius como servidor MCP

Denarius expone sus herramientas financieras mediante Model Context Protocol (MCP) sobre HTTP. El endpoint reutiliza `denarius-tools`; por eso conserva la resolución server-side del tenant, RLS, auditoría, límite de uso y los cálculos financieros existentes.

## Endpoint

`https://fcdhcntyvsydnvjwopfe.supabase.co/functions/v1/denarius-mcp`

El cliente envía un access token de Denarius en `Authorization: Bearer <token>`. Se soportan `initialize`, `notifications/initialized`, `ping`, `tools/list` y `tools/call` con MCP `2025-11-25`. La metadata RFC 9728 vive en `denarius-mcp-metadata` y las respuestas 401 publican su ubicación mediante `WWW-Authenticate`.

## Límites de esta entrega

- Transporte HTTP JSON; no mantiene sesiones ni SSE.
- La pantalla de consentimiento está disponible en `/oauth/consent`; la activación del servidor OAuth compartido requiere resolver primero el `site_url` común con Validus.
- Once herramientas read-only. `simulate_scenario` tampoco persiste datos.
- El tenant nunca forma parte de los argumentos MCP: se resuelve desde la identidad autenticada.

## Cliente de escritorio

Los clientes MCP que acepten encabezados HTTP pueden configurar la URL anterior y el bearer token de la sesión. No se deben guardar tokens en el repositorio ni compartirlos entre usuarios.
