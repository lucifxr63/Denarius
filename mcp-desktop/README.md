# Denarius MCP Desktop

Puente local `stdio` hacia las herramientas financieras read-only de Denarius.
Cada instalación usa una API key individual y nunca recibe un `tenant_id` desde
el chatbot.

```json
{
  "mcpServers": {
    "denarius": {
      "command": "npx",
      "args": ["-y", "denarius-mcp"],
      "env": { "DENARIUS_API_KEY": "dnr_live_..." }
    }
  }
}
```

La clave no debe guardarse en el repositorio ni compartirse entre usuarios.
Puede revocarse desde Denarius y sólo permite `financial:read`.
