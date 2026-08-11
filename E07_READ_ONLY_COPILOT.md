# E07 — Copiloto financiero read-only

## Alcance del primer bloque

- Selector determinista de intenciones sobre el catálogo E06.
- Nueve herramientas de lectura, incluida explicación del mínimo de caja.
- Simulación de atraso de una factura AR pendiente, siempre no persistente.
- Rechazo explícito de cruces de tenant, escrituras y elevación de privilegios.
- Clarificación cuando falta factura, métrica o intención financiera.

## Criterios de aceptación

- Una pregunta soportada produce una solicitud tipada, nunca SQL ni acceso directo.
- La empresa activa se sigue resolviendo exclusivamente desde el JWT en servidor.
- `simulate_scenario` devuelve `persisted: false` y no modifica la factura fuente.
- `explain_projection_point` cita los eventos que ocurren en la fecha de saldo mínimo.
- Q10, Q11 y Q12 son rechazadas sin invocar herramientas.
- Las respuestas de herramientas conservan `as_of`, moneda, fuentes y tenant.

## No aceptado en este bloque

- Escrituras, pagos o cambios de vencimiento desde conversación.
- Elegir libremente un tenant desde el texto del usuario.
- Enviar service-role a navegador, modelo o cliente desktop.
- Persistir historial antes de definir retención, eliminación y consentimiento.
- Tratar texto importado de facturas o PDFs como instrucciones del sistema.

## Próximo incremento

Chat embebido en Denarius que consume el selector y la Edge Function, renderiza
evidencias y deep links, y conserva historial solo después de aprobar su política
de datos.

## Incremento de experiencia embebida

- Copiloto disponible en todas las rutas autenticadas mediante un único montaje.
- Carga diferida para no aumentar el bundle de Landing/Login.
- Preguntas sugeridas, entrada libre y selector determinista de herramientas.
- Respuestas financieras formateadas con fecha de corte, fuentes y deep links.
- Estados de carga, error, vacío y rechazo seguro.
- Panel responsive con navegación por teclado, foco visible y cierre con Escape.
- Conversación mantenida solo en memoria; no existe historial persistente todavía.

### Criterio de salida del incremento

El frontend compila, el selector y el presentador están cubiertos por pruebas, y
ninguna consulta puede proporcionar `tenant_id`, service-role ni instrucciones de
escritura al endpoint financiero.

La política previa a cualquier historial persistente se documenta en
`COPILOT_DATA_POLICY_V0.md`. Hasta su aprobación e implementación E2E, el chat
permanece exclusivamente en memoria.
