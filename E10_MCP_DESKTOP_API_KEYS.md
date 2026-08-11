# E10 — MCP Desktop: identidad mediante API keys

## Decisión

Denarius tendrá credenciales propias sin modificar Supabase Auth, el `site_url`
compartido ni el login de Validus. Cada clave pertenece a un usuario y un tenant,
posee únicamente el scope `financial:read` y puede revocarse.

## Contrato de seguridad

- Formato del secreto: `dnr_live_` más 48 caracteres hexadecimales aleatorios.
- El secreto se muestra una sola vez al crearlo.
- La base sólo conserva su hash SHA-256 y un prefijo identificable.
- Los usuarios nunca pueden leer la tabla ni resolver hashes directamente.
- Sólo el gateway con rol `service_role` puede resolver una clave activa.
- No se almacenan contraseñas, access tokens ni refresh tokens.
- Ningún argumento MCP permite seleccionar `tenant_id`.

## Estado del incremento

La migración `20260807080000_denarius_api_keys.sql` implementa creación, listado
seguro, revocación, expiración y resolución interna. El endpoint HTTP actual sigue
usando access tokens mientras el siguiente incremento conecta el principal de API
key con el ejecutor financiero y publica el paquete MCP `stdio`.

## Criterios de aceptación siguientes

1. Una clave válida sólo accede al tenant con el que fue creada.
2. Una clave revocada o expirada falla sin ejecutar herramientas.
3. Las nueve herramientas continúan siendo de sólo lectura.
4. Cada llamada registra `key_id`, usuario, tenant, herramienta y resultado.
5. Validus sigue iniciando sesión sin cambios de OAuth, rutas o configuración.
