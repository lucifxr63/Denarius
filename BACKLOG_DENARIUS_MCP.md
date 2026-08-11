# Backlog priorizado — Denarius y Denarius MCP

> Corte: 7 de agosto de 2026. Estados: `DONE`, `IN_PROGRESS`, `NEXT`, `PLANNED`, `DISCOVERY`, `DEFERRED`.
>
> Decisión vigente: la publicación npm queda diferida. El desarrollo continúa en
> calidad MCP y en la fuente financiera de Denarius.

## Objetivo

Convertir Denarius en la fuente financiera confiable de startups y PyMEs,
accesible desde web y MCP: primero consultas seguras y después acciones controladas.

## N0 — Base MCP segura

| ID | Estado | P | Resultado | Aceptación |
|---|---|---:|---|---|
| MCP-001 | DONE | P0 | 9 tools read-only | Contratos cerrados, sin `tenant_id` |
| MCP-002 | DONE | P0 | Servidor HTTP MCP | Inicializa, lista y ejecuta tools |
| MCP-003 | DONE | P0 | API keys por empresa | Hash, expiración, revocación y scope |
| MCP-004 | DONE | P0 | Principal interno | Empresa resuelta server-side; cero cruces |
| MCP-005 | DONE | P0 | Auditoría y rate limit | Clave/tool/estado/latencia; 30 rpm |
| MCP-006 | DONE | P0 | UI de conexiones | Crear, copiar una vez, listar y revocar |
| MCP-007 | DONE | P0 | Puente `stdio` | Requiere API key; sin secretos internos |

## N1 — Publicación npm (diferida)

| ID | Estado | P | Resultado | Aceptación |
|---|---|---:|---|---|
| MCP-101 | DEFERRED | P0 | Nombre y ownership npm | Paquete reservado por cuenta oficial |
| MCP-102 | DEFERRED | P0 | Metadata/licencia/changelog | `npm pack --dry-run` correcto |
| MCP-103 | DEFERRED | P0 | Instalación multiplataforma | Windows/macOS/Linux, Node 20/22 |
| MCP-104 | DEFERRED | P0 | Certificación de clientes | Claude Desktop y Cursor ejecutan 9 tools |
| MCP-105 | DEFERRED | P0 | Errores de credenciales | Ausente/inválida/expirada/revocada |
| MCP-106 | DEFERRED | P0 | Release automatizado | Provenance, semver y rollback |
| MCP-107 | DEFERRED | P1 | Config copiable en UI | Nunca revela una clave pasada |
| MCP-108 | DONE | P1 | Rotación de claves | Sucesora de entrega única, solapamiento y corte server-side |

## N2 — Calidad conversacional

| ID | Estado | P | Resultado | Aceptación |
|---|---|---:|---|---|
| MCP-201 | DONE | P0 | Suite cross-tenant | Cero accesos cruzados continuos |
| MCP-202 | DONE | P0 | Preguntas doradas | Tool, respuesta y evidencia correctas |
| MCP-203 | DONE | P1 | Deep links | Las 9 tools abren la vista financiera correspondiente |
| MCP-204 | DONE | P1 | Historial por empresa | Visible, filtrable y eliminable bajo RLS |
| MCP-205 | DONE | P1 | Evidencia granular | Valores y corte acotados, sin PII innecesaria |
| MCP-206 | PLANNED | P1 | Paginación | Cursores y límites estables |
| MCP-207 | PLANNED | P2 | Detección anómala | Alertas útiles sin registrar secretos |

## N3 — MCP Cloud

| ID | Estado | P | Resultado | Aceptación |
|---|---|---:|---|---|
| MCP-301 | DISCOVERY | P0 | Hub neutral de identidad | Aprobado por todos los productos |
| MCP-302 | DISCOVERY | P0 | Audiencias por producto | Token Denarius no autoriza Validus |
| MCP-303 | DISCOVERY | P0 | OAuth 2.1 + PKCE | Consentimiento sin romper Validus |
| MCP-304 | PLANNED | P1 | Gestión de conexiones | Revocación cloud desde Denarius |

## N4 — Acciones controladas

| ID | Estado | P | Resultado | Aceptación |
|---|---|---:|---|---|
| MCP-401 | DISCOVERY | P0 | Contrato de confirmación | Preview y comprobante auditable |
| MCP-402 | PLANNED | P0 | Idempotencia/concurrencia | Reintentos no duplican ni pisan |
| MCP-403 | PLANNED | P1 | Borrador de factura | Nunca publica ni paga |
| MCP-404 | PLANNED | P1 | Categorizar movimiento | Antes/después y reversión |
| MCP-405 | PLANNED | P1 | Guardar escenario | Separado de datos reales |
| MCP-406 | PLANNED | P2 | Ajustar recurrencia | Impacto previo a confirmación |

## Mejoras propias de Denarius

| ID | Estado | P | Mejora | Aceptación |
|---|---|---:|---|---|
| DEN-101 | DONE | P0 | Corregir MSP → MCP | UI/docs consistentes; API neutral certificada sin renombrar almacenamiento legado |
| DEN-102 | DONE | P0 | Conciliación/idempotencia | Reimportación certificada sin movimientos ni saldo duplicados |
| DEN-103 | DONE | P0 | Importador CSV | Preview, mapeo, validación y duplicados en servidor |
| DEN-104 | DONE | P0 | Onboarding accionable | Diagnóstico, línea base y primera proyección en una sesión |
| DEN-105 | DONE | P1 | Centro de alertas | Caja, mora, runway, impuestos, concentración y renovaciones; agregado sin PII |
| DEN-106 | DONE | P1 | Cierre semanal + unit economics | Checklist, historial, ARPA, margen, CAC, LTV/CAC, payback y evaluación de viabilidad |
| DEN-107 | PLANNED | P1 | Multiusuario/roles | Owner, financiero, contador, lector |
| DEN-108 | PLANNED | P1 | Moneda base | Conversión coherente y trazable |
| DEN-109 | DONE | P1 | Frescura de datos | Estado, cobertura, antigüedad y acción por fuente; integrado al cierre semanal |
| DEN-110 | PLANNED | P1 | Accesibilidad/performance | WCAG AA y presupuesto por ruta |
| DEN-111 | DISCOVERY | P2 | Open Banking | Sync incremental e idempotente |
| DEN-112 | DISCOVERY | P2 | SII | Consentimiento y calendario real |
| DEN-113 | DISCOVERY | P2 | Forecast probabilístico | Intervalos calibrados |
| DEN-114 | PLANNED | P2 | Portabilidad | CSV/JSON y retención |

## Operación

| ID | Estado | P | Mejora | Aceptación |
|---|---|---:|---|---|
| OPS-101 | DONE | P0 | CI de migraciones/Functions | Gate local/CI y certificación remota antes de base compartida |
| OPS-102 | DONE | P0 | Rollback frontend/MCP/plataforma | Manifiesto y recuperación no destructiva ensayados |
| OPS-103 | DONE | P1 | Analítica de activación | Primera proyección, conexión y consulta MCP derivadas sin duplicar eventos |
| OPS-104 | DONE | P1 | Observabilidad por release | Canal, estado, latencia y versión; sin contenido financiero sensible |
| OPS-105 | DONE | P1 | Soporte beta | Canal interno, diagnóstico seguro, SLA y revocación urgente certificada |
| OPS-106 | DISCOVERY | P2 | Pricing | Validación por empresa/usuario/canal |

## Orden inmediato

1. Piloto beta controlado con 5–10 empresas.
2. `DEN-110`: accesibilidad y presupuesto de rendimiento por ruta.
3. Retomar `MCP-101`–`MCP-107` cuando se autorice la publicación npm.

## No aceptado

- Cambiar OAuth global o redirigir Validus hacia Denarius.
- Guardar claves, tokens o datos financieros en logs.
- Permitir `tenant_id` en argumentos MCP.
- Publicar escrituras bajo `financial:read`.
- Automatizar pagos, impuestos, borrados o permisos.
- Presentar roadmap o beta como funcionalidad ya disponible.
