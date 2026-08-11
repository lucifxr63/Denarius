# Certificación MCP — 2026-08-07

## Alcance

Certificación remota del endpoint de producción mediante el script
`launch/integration-test-mcp-isolation.mjs`. La prueba crea dos usuarios y empresas
temporales con saldos, facturas y claves diferentes, y elimina todo con cascade.

## Resultado

- Las nueve herramientas respondieron mediante API key.
- Todas conservaron `tenant_id`, `as_of`, moneda y fuentes.
- Las claves A y B resolvieron exclusivamente su empresa.
- Los saldos de A y B permanecieron distintos.
- La lista de vencimientos A no incluyó contactos de B.
- El usuario A no pudo crear una clave para la empresa B.
- Un `tenant_id` forjado en argumentos fue rechazado.
- Una herramienta de escritura no publicada fue rechazada.
- A no pudo simular un escenario usando una factura de B.
- Los dos usuarios temporales fueron eliminados al finalizar.
- Huella residual esperada: cero.

## Reproducción

```bash
npm run certify:mcp-isolation
```

Requiere `.env.local` con URL, anon key y service role del proyecto de prueba o
producción controlada. El secreto de service role sólo existe en el proceso de
certificación y nunca se envía al cliente MCP.

## Puertas satisfechas

- `MCP-201`: suite cross-tenant.
- `MCP-202`: ejecución remota del catálogo y evidencia estructurada.

La publicación npm permanece diferida y no forma parte de esta certificación.
