# Matriz inicial de permisos — agente Denarius

## Reglas generales

- Toda herramienta recibe un `tenant_id` resuelto por el servidor, nunca confiado
  directamente desde texto del usuario.
- Lecturas incluyen fecha de corte, moneda y fuentes.
- Escrituras requieren idempotency key, bitácora y comprobación posterior.
- Ninguna operación usa service-role desde web, desktop o modelo.

## Matriz

| Capacidad | Primer MCP | Futuro | Control obligatorio |
|---|---|---|---|
| Consultar caja y reserva | Lectura automática | Lectura | RLS + fecha de corte |
| Consultar burn/runway | Lectura automática | Lectura | Explicar período y fórmula |
| Listar vencimientos | Lectura automática | Lectura | RLS + paginación |
| Simular escenario | Automática, no persiste | Guardar con confirmación | Marcar como simulación |
| Explicar una métrica | Lectura automática | Lectura | Citar fuentes |
| Crear borrador de factura | No disponible | Confirmación | Preview + idempotencia |
| Categorizar movimiento | Propuesta | Confirmación | Mostrar antes/después |
| Ajustar recurrencia | Propuesta | Confirmación reforzada | Impacto en proyección |
| Marcar alerta resuelta | No disponible | Confirmación simple | Auditoría |
| Eliminar movimiento/factura | Prohibido | UI humana únicamente | Reautenticación |
| Cambiar impuestos | Prohibido | UI humana únicamente | Rol owner/admin |
| Invitar/cambiar roles | Prohibido | UI humana únicamente | Reautenticación + auditoría |
| Ejecutar pago/transferencia | Prohibido | Fuera de alcance | — |
| Presentar declaración SII | Prohibido | Fuera de alcance inicial | — |
| Acceder a otra empresa | Prohibido | Sólo acceso delegado vigente | Consentimiento + rol |

## Respuesta segura

Si falta dato, permiso o fuente, el agente debe indicar la limitación y ofrecer la
pantalla o acción humana correspondiente. Nunca debe completar montos, fechas,
monedas o estados por inferencia silenciosa.
