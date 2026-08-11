# Arquitectura de Denarius

> Fuente vigente al 2026-08-11. Producción: `https://denarius.scouttech.lat`.

## Vista general

Denarius es una SPA React/TypeScript desplegada en Vercel. Supabase aporta autenticación, Postgres, Row Level Security y Edge Functions. La web y el MCP consumen una misma capa financiera y preservan a Denarius como fuente de verdad.

```text
Web (React/Vite) ───────┐
                       ├─ Edge Functions/RPC ─ Postgres (`cashflow`)
Claude (OAuth MCP) ─────┤                         │
Desktop (API key) ──────┘                    RLS + auditoría
```

## Plataforma e identidad compartidas

El proyecto Supabase se comparte con Validus, Licitus y Animus. `auth.users` representa la identidad común. Denarius no guarda sus roles en metadata global ni elimina la identidad al suspender o retirar un miembro.

Los objetos de negocio, membresías, permisos, claves MCP, grants, auditoría y métricas de Denarius se aíslan en el esquema `cashflow`. Toda migración debe ser aditiva. Están prohibidos `DROP`, `TRUNCATE`, renombres destructivos y `supabase db push` no controlado; la recuperación de datos usa correcciones hacia adelante.

## Autorización multiempresa

La autorización combina sesión, compañía activa, membresía y permiso. El servidor resuelve el tenant; identificadores enviados por un cliente nunca sustituyen ese contexto. Las certificaciones cubren aislamiento cross-tenant en web, RPC y MCP.

Permisos vigentes:

- `financial.read`
- `financial.write`
- `operations.write`
- `close.read`
- `close.manage`
- `team.manage`
- `mcp.manage`

Las plantillas de rol se describen en el README. El administrador de plataforma tiene una vía separada para preparar sandboxes demo.

## Dominio de datos

El núcleo incluye compañías, membresías, cuentas bancarias, transacciones, facturas, recurrencias y configuración. Los módulos agregan importaciones, contexto de onboarding, proyección, alertas, cierres, unit economics, acciones y resultados. Startup SaaS añade clientes/suscripciones, MRR, lifecycle, retención, riesgo y renovaciones.

Los cálculos deben indicar fecha de corte, moneda, confianza y fuentes. La caja tributaria se presenta separada de la caja disponible. Los cierres preservan snapshots para que cambios posteriores no reescriban la historia.

## MCP

El gateway MCP implementa `2025-11-25`, JSON-RPC y descubrimiento OAuth. Admite grants OAuth por empresa y API keys cuyo secreto se muestra una vez y se conserva como hash. Los scopes MCP (`financial:read`, `alerts:read`, `actions:write`) se traducen a permisos Denarius y se verifican antes de ejecutar.

El catálogo posee 14 herramientas. Las consultas nunca persisten simulaciones. Las escrituras solo crean/actualizan acciones financieras, exigen scope y aprobación explícita, y quedan auditadas. No se registran preguntas, argumentos, respuestas financieras ni secretos en la auditoría operativa.

## Observabilidad y privacidad

- Salud, errores y latencia se revisan por release.
- Las ejecuciones MCP registran identidad técnica, empresa, herramienta, estado y duración, no contenido financiero.
- Las métricas UX usan eventos y superficies predefinidos; rechazan propiedades libres y PII.
- Soporte rechaza PII y dispone de procedimiento de revocación urgente de claves/grants.
- Las certificaciones remotas crean sujetos efímeros y verifican cero huella al finalizar.

## Release y recuperación

El manifiesto en `release-manifests/current.json` fija release, artefactos y objetivo anterior. El frontend puede revertirse al deployment verificado. Las Edge Functions se redespliegan desde artefactos conocidos. La base no se revierte destructivamente: se aplica `forward-fix`.

Puertas obligatorias:

```bash
npm run check
npm run certify:beta-go-no-go
npm run rollback:rehearse -- release-manifests/current.json
```

La evidencia actual se encuentra en [docs/certification/GO_NO_GO_BETA_2026-08-11.md](./docs/certification/GO_NO_GO_BETA_2026-08-11.md).
