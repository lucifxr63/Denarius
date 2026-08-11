# MCP-108 — Rotación segura de API keys

## Flujo

1. El propietario selecciona una clave activa y una ventana de 15 minutos, 1 hora, 24 horas o 7 días.
2. Denarius crea una sucesora con el mismo tenant y alcance `financial:read`.
3. El secreto nuevo se muestra una sola vez.
4. Ambas claves funcionan durante la ventana para permitir actualizar el cliente MCP.
5. Al vencer, el gateway rechaza la anterior en servidor y el listado registra su revocación efectiva.

## Garantías

- Una clave sólo puede tener una sucesora.
- La fila se bloquea durante la rotación para impedir carreras.
- No se puede rotar una clave vencida, revocada o ya rotada.
- Revocar manualmente continúa siendo inmediato.
- Rotar nunca cambia tenant, propietario ni scopes.
- El hash y el secreto no llegan al listado ni a la interfaz.
