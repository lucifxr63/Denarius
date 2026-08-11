# Acta Go/No-Go · Beta cerrada Denarius

Fecha: 2026-08-11
Release: `2026-08-11-denarius-beta-rc1`
Producción: https://denarius.scouttech.lat

## Decisión

**GO PARA BETA CERRADA CONTROLADA**

Esta decisión autoriza incorporar un grupo limitado de pilotos con onboarding acompañado. No autoriza lanzamiento público, autoservicio masivo ni publicación del paquete MCP en npm.

## Evidencia aprobada

- Puerta local: 149/149 pruebas y build de producción.
- Matriz de Owner, Finanzas, Operaciones, Viewer y Advisor.
- Aislamiento cross-tenant en web, RPC y MCP.
- Happy flows completos para PyME y Startup.
- Invitación, rol, suspensión, reactivación y retiro de miembros.
- MCP OAuth 2025-11-25 y API keys con scopes.
- Catálogo MCP de 14 herramientas y evidencia financiera.
- Observabilidad, activación y salud por release.
- Soporte beta, rechazo de PII y revocación urgente.
- Métricas de experiencia agregadas sin PII.
- Frescura de datos incorporada al cierre.
- Todas las certificaciones remotas terminaron con cero huella.

## Protección de plataforma compartida

- Validus, Licitus y Animus no fueron modificados por los roles Denarius.
- Las identidades compartidas sobreviven a suspensión o retiro en Denarius.
- La base utiliza migraciones aditivas y estrategia `forward-fix`.
- `DROP`, `TRUNCATE`, renombres y rollback destructivo permanecen prohibidos.

## Rollback

- Frontend actual: `dpl_EzmvJytmnQZHPPfQA6MeAAMWTk6Y`.
- Frontend anterior verificado: `dpl_GxKb3dH9hmLSwQvLjE1jkC6LDWKv`.
- Objetivo: `https://cashflow-eisg6tizh-lucifxr63s-projects.vercel.app`.
- Edge Functions: redeploy desde `release-artifacts/2026-08-07-ops103-104`.
- Base de datos: solo corrección aditiva hacia adelante.

## Condiciones durante la beta

1. Incorporar pilotos por cohortes pequeñas y con responsable asignado.
2. Revisar activación, errores, latencia, soporte y cierre semanal durante las primeras 48 horas de cada cohorte.
3. Usar revocación urgente ante sospecha de exposición de una clave MCP.
4. No recopilar montos, preguntas, correos ni contenido financiero en analítica de experiencia.
5. Volver a ejecutar `npm run certify:beta-go-no-go` antes de cada release candidata.

## Comandos de evidencia

```bash
npm run check
npm run certify:beta-go-no-go
npm run rollback:rehearse -- release-manifests/current.json
```

## Resultado final

No existen bloqueos técnicos activos para comenzar la beta cerrada bajo las condiciones anteriores.
