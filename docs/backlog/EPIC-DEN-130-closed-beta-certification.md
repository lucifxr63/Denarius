# DEN-130 · Certificación de beta cerrada

## Objetivo

Permitir el ingreso de pilotos solo cuando Denarius demuestre aislamiento entre empresas, permisos efectivos por rol, recorrido financiero completo, soporte observable y recuperación ensayada.

## Criterios de aceptación

- Owner, Finanzas, Operaciones, Viewer y Advisor cumplen exactamente su plantilla.
- Ningún miembro accede a una empresa no asignada.
- El flujo operaciones → alertas → cierre → plan conserva tenant y evidencia.
- Invitaciones, suspensión y revocación se prueban sin afectar identidades compartidas.
- MCP no cruza tenants y las acciones requieren scopes explícitos.
- Monitoreo, soporte y métricas de activación responden en producción.
- Existe un manifiesto vigente y un ensayo de rollback no destructivo.
- Todas las pruebas remotas eliminan sus usuarios y datos temporales.

## No se acepta

- Certificar solo mediante botones ocultos o pruebas visuales.
- Usar `owner_id` aportado por el cliente.
- Borrar, renombrar o recrear tablas de la base compartida.
- Publicar la beta con una prueba roja o sin objetivo de rollback.

## Bloques

1. Matriz real de roles y aislamiento.
2. Happy flows PyME y Startup por rol. **Automatizado:** onboarding → operaciones/MRR → alertas → cierre → plan → resultado → recuperación de sesión.
3. Ciclo de invitación, suspensión y revocación.
4. Certificación MCP, observabilidad, soporte y experiencia. **Aprobada:** `docs/certification/OPERATIONAL_GATE_2026-08-10.md`.
5. Recuperación de sesión, errores y estados vacíos.
6. Ensayo de rollback y acta final Go/No-Go.

## Estado final

**GO para beta cerrada controlada.** Evidencia: `docs/certification/GO_NO_GO_BETA_2026-08-11.md`.
