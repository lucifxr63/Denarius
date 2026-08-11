# Denarius

Denarius es una plataforma de inteligencia de flujo de caja para PyMEs y startups. Convierte cuentas, movimientos, facturas, recurrencias y suscripciones en una lectura accionable de caja: qué está ocurriendo, qué riesgo atender, qué acción ejecutar y qué resultado tuvo en el siguiente cierre semanal.

**Estado al 11 de agosto de 2026:** candidato aprobado para **beta cerrada controlada**. El producto está desplegado en [denarius.scouttech.lat](https://denarius.scouttech.lat). La publicación pública del cliente MCP en npm permanece postergada.

## Qué ofrece

- Diagnóstico inicial y contexto de empresa con un único modelo por compañía: `pyme-tradicional` o `startup-saas`.
- Cuentas, transacciones, facturas por cobrar/pagar, flujos recurrentes e importación CSV.
- Caja actual, caja tributaria restringida, burn, runway, proyección y calidad/frescura de datos.
- Alertas priorizadas y un ciclo de decisión: **entender → priorizar → actuar → medir**.
- Cierre semanal con snapshot, unit economics, plan de acción, responsables, fechas, impacto esperado y resultado posterior.
- Para startups: suscripciones, MRR, retención, riesgo y renovaciones.
- Equipos con roles, permisos por empresa y ciclo de invitación, suspensión, reactivación y retiro.
- Demos guiadas para PyME y Startup, centro de aprendizaje y métricas de experiencia sin PII.
- Integración MCP con Claude y clientes desktop para consultar finanzas, vigilar alertas y, con permiso explícito, administrar acciones.

Los buyer persona prioritarios son el **dueño o gerente de PyME**, que necesita anticipar faltantes y ordenar cobros/pagos, y el **founder o CEO de startup**, que necesita relacionar MRR, burn, runway y eficiencia antes de crecer.

## Arquitectura

```text
React 19 + TypeScript + Vite
              │
              ▼
Supabase Auth + Postgres/RLS + Edge Functions
              │
       esquema cashflow
              │
     ┌────────┴────────┐
     ▼                 ▼
  Web app        MCP HTTP/OAuth/API key
                       │
                  Claude/Desktop
```

Denarius comparte el proyecto Supabase y `auth.users` con Validus, Licitus y Animus, pero sus datos, funciones, roles, claves y auditoría viven en el esquema `cashflow`. Las migraciones deben ser aditivas y el rollback de base de datos es `forward-fix`; no se permiten cambios destructivos sobre la plataforma compartida. Consulte [ARCHITECTURE.md](./ARCHITECTURE.md).

## Roles

| Rol | Permisos principales |
|---|---|
| Owner | lectura/escritura financiera, cierres, equipo y MCP |
| Finance manager | lectura/escritura financiera y cierres |
| Operator | lectura financiera y registro de operaciones |
| Viewer | lectura financiera |
| Advisor | lectura financiera y de cierres |

Los permisos siempre se resuelven dentro de la empresa activa. Suspender o retirar a una persona de Denarius no elimina ni modifica su identidad compartida con los otros productos.

## Denarius MCP

El MCP implementa Model Context Protocol `2025-11-25` y expone 14 herramientas. Admite OAuth para Claude y API keys individuales para el puente desktop. Los scopes son `financial:read`, `alerts:read` y `actions:write`; el servidor resuelve la empresa y nunca acepta un `tenant_id` proporcionado por el cliente. Las escrituras están limitadas a acciones financieras y requieren aprobación explícita en el cliente.

La especificación, catálogo y límites están en [DENARIUS_MCP_PRODUCT.md](./DENARIUS_MCP_PRODUCT.md).

## Desarrollo local

Requisitos: Node.js 20 o superior, npm y un proyecto Supabase configurado.

```bash
npm install
npm run dev
```

Las variables públicas requeridas por el frontend se documentan en `.env.example`. No incluya `service_role`, claves MCP ni secretos en el navegador, commits o telemetría.

Comprobaciones principales:

```bash
npm run check
npm run certify:beta-go-no-go
npm run rollback:rehearse -- release-manifests/current.json
```

`npm run check` ejecuta la suite de contratos y el build. Las certificaciones remotas necesitan credenciales de prueba autorizadas y deben terminar con cero huella.

## Estructura

| Ruta | Contenido |
|---|---|
| `src/` | Aplicación web, componentes y acceso a datos |
| `supabase/migrations/` | Evolución aditiva del esquema `cashflow` |
| `supabase/functions/` | APIs, MCP, OAuth y procesos operativos |
| `mcp-desktop/` | Puente MCP `stdio`; aún no publicado en npm |
| `tests/` | Contratos unitarios y de producto |
| `launch/` | Certificaciones integrales contra entorno remoto |
| `scripts/` | Aplicación controlada de migraciones, auditoría y release gates |
| `docs/` | Índice, operación, certificación e historia del producto |

## Estado de release

La decisión vigente es **GO para beta cerrada controlada**, no lanzamiento público. La evidencia, condiciones de operación y referencias de rollback están en [GO_NO_GO_BETA_2026-08-11.md](./docs/certification/GO_NO_GO_BETA_2026-08-11.md). Antes de cada release candidata se debe repetir la puerta completa.

## Documentación

Empiece por [docs/README.md](./docs/README.md). La referencia funcional actual es [DOCUMENTACION_ACTUALIZADA.md](./DOCUMENTACION_ACTUALIZADA.md); los documentos de épicas e incrementos conservan el historial de decisiones, pero no sustituyen estas fuentes vigentes.
