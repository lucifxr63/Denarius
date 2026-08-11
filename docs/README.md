# Índice de documentación

## Fuentes vigentes

- [README del proyecto](../README.md): propósito, estado, stack, desarrollo y release.
- [Documentación funcional](../DOCUMENTACION_ACTUALIZADA.md): usuarios, capacidades, límites y dirección.
- [Arquitectura](../ARCHITECTURE.md): plataforma compartida, seguridad, datos, MCP y recuperación.
- [Denarius MCP](../DENARIUS_MCP_PRODUCT.md): contrato, herramientas, scopes y roadmap.
- [Go/No-Go beta](./certification/GO_NO_GO_BETA_2026-08-11.md): decisión y condiciones de operación.
- [Puerta operativa](./certification/OPERATIONAL_GATE_2026-08-10.md): MCP, observabilidad, soporte y experiencia.

## Backlog y producto

- [Backlog Denarius MCP](../BACKLOG_DENARIUS_MCP.md)

Estos documentos orientan el trabajo pendiente. Si una afirmación de estado contradice una fuente vigente, prevalecen las fuentes de la sección anterior y el código certificado.

## Historial

Los archivos `IMPLEMENTATION_*`, `MILESTONE_*`, `E0*`, `DEN-*`, `MCP-*`, `OPS-*`, planes de sprint y reportes de auditoría conservan decisiones y evidencia de incrementos anteriores. No representan por sí solos el alcance actualmente desplegado.

## Regla de actualización

Ante un cambio funcional, de seguridad o release:

1. Actualizar el README y la fuente especializada afectada.
2. Añadir/actualizar contratos automatizados y evidencia de certificación.
3. Registrar la fecha de corte y diferenciar desplegado, certificado y futuro.
4. No declarar npm, integraciones o escrituras como disponibles antes de su puerta correspondiente.
