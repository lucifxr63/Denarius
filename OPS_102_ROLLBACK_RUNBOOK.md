# OPS-102 — Recuperación de Denarius

## Objetivo

Recuperar el servicio sin comprometer la identidad o la información compartida con Validus, Licitus y Animus. El manifiesto vigente es `release-manifests/current.json`.

## Activación

Se activa ante errores de autenticación, cruces entre empresas, respuestas MCP incorrectas, corrupción visible de métricas o indisponibilidad posterior a un release. Un problema de seguridad o aislamiento exige además revocar/inhabilitar el componente afectado.

## Orden de recuperación

1. Detener nuevos despliegues y registrar hora, release e impacto.
2. Ejecutar `npm run rollback:rehearse` para validar el manifiesto.
3. Frontend: `vercel rollback <frontend.rollbackTarget> --yes`.
4. Edge Functions: desplegar el artefacto estable indicado por el manifiesto y verificar sus hashes; no reconstruir desde una rama mutable.
5. Base compartida: crear una nueva migración aditiva de corrección. Nunca borrar, renombrar ni marcar como no aplicada una migración ya ejecutada.
6. Ejecutar smoke de login, aislamiento MCP, dashboard y tareas financieras.
7. Confirmar el alias `https://denarius.scouttech.lat`, documentar resultado y recién entonces reabrir despliegues.

## Criterios de éxito

- Login y selección de empresa funcionan.
- Un usuario no puede consultar otra empresa.
- Las herramientas MCP responden con la versión esperada.
- Dashboard y fuente financiera central concuerdan.
- No se eliminaron usuarios, datos ni contratos usados por otros productos.

## Abortado / no aceptado

- `DROP`, `TRUNCATE`, renombrado de tablas o borrado de usuarios.
- Cambiar OAuth global durante un incidente de Denarius.
- Usar una rama sin tag o artefacto verificable como respaldo de Functions.
- Declarar recuperación sin ejecutar las certificaciones remotas aplicables.

## Ensayo del 7 de agosto de 2026

Se verificaron dos despliegues productivos `READY`: el actual `cashflow-8q0s2m44f-lucifxr63s-projects.vercel.app` y el objetivo anterior `cashflow-i0gktzgm2-lucifxr63s-projects.vercel.app`. El ensayo automatizado valida ambos objetivos, las tres Edge Functions y la política de forward-fix sin alterar producción.
