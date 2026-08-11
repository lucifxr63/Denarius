# Denarius — documentación funcional vigente

> Corte: 2026-08-11 · Estado: GO para beta cerrada controlada.

## Propósito

Denarius ayuda a una empresa a convertir datos financieros operativos en decisiones semanales trazables. La promesa no es solo mostrar características o reportes: es reducir el tiempo entre detectar un riesgo de caja, asignar una acción y comprobar su efecto.

El ciclo del producto es:

1. **Entender:** consolidar caja, compromisos, recurrencias, proyección y calidad de fuentes.
2. **Priorizar:** ordenar alertas por severidad e impacto.
3. **Actuar:** crear un plan con responsable, fecha e impacto esperado.
4. **Medir:** cerrar la semana, preservar el snapshot y comparar el resultado.

## Usuarios prioritarios y resultados

### Dueño o gerente de PyME

Necesita saber si alcanzará la caja, qué cobrar primero y qué pagos puede asumir. Denarius le ofrece posición disponible, obligaciones, vencimientos, reserva tributaria, proyección, alertas y un cierre que deja responsables claros.

### Founder o CEO de startup

Necesita decidir cuánto y cuándo crecer sin perder control del runway. Denarius conecta caja, MRR, burn, churn, retención, renovaciones y unit economics para respaldar decisiones de contratación, adquisición o protección de capital.

Una compañía normal selecciona un solo modelo, `pyme-tradicional` o `startup-saas`. El administrador de plataforma puede preparar sandboxes demostrativos de ambos modelos sin alterar la compañía real.

## Capacidades disponibles

### Activación y datos

- Inicio de sesión con identidad compartida de la plataforma Scouttech.
- Creación/selección de compañía, diagnóstico del modelo y contexto operativo.
- Bootstrap de cuenta financiera e importación CSV con previsualización y detección de duplicados.
- Registro de cuentas, movimientos, facturas y recurrencias.
- Indicador de frescura, procedencia y confianza de los datos.

### Control financiero

- Caja actual, restringida y disponible.
- Burn y runway.
- Proyección a 30, 90 y 365 días.
- Facturas vencidas, compromisos y alertas priorizadas.
- Métricas explicables con fórmula, fecha de corte, moneda y fuentes.
- Suscripciones, MRR, lifecycle, retención, riesgo y renovaciones para Startup SaaS.

### Decisión y seguimiento

- Cierre semanal con snapshot e historial.
- Unit economics adaptados al modelo de negocio.
- Plan semanal generado desde señales reales.
- Responsable, vencimiento, impacto esperado, estado y resultado posterior por acción.
- Storytelling y gráficos diferenciados para PyME y Startup.

### Equipo y gobierno

- Invitación, aceptación, cambio de rol, suspensión, reactivación y retiro.
- Plantillas Owner, Finance manager, Operator, Viewer y Advisor.
- Autorización por permiso y empresa activa.
- Auditoría de operaciones sensibles sin guardar contenido financiero en telemetría.

### Aprendizaje y beta

- Demos compartibles en `/demo/pyme` y `/demo/startup`.
- Sandbox administrado y centro de aprendizaje por buyer persona.
- Soporte beta estructurado, SLA y revocación urgente de conexiones MCP.
- Métricas de experiencia con esquema cerrado, sin montos, preguntas, correos ni payloads.

## MCP, no MSP

Denarius se integra mediante **MCP (Model Context Protocol)**. No se está construyendo un Managed Service Provider. El chatbot es una interfaz adicional; Denarius continúa siendo la fuente de verdad, el historial, el control de permisos y la superficie visual.

El servidor MCP está disponible por OAuth para Claude y por API key para clientes desktop. Expone 14 herramientas bajo `financial:read`, `alerts:read` y `actions:write`. Puede consultar posición, proyección, facturas, métricas, planes, resultados y alertas; también puede crear o actualizar acciones cuando el usuario otorgó el scope y aprueba la ejecución. No puede realizar pagos, transferencias, impuestos, borrar registros contables ni administrar permisos.

Consulte [DENARIUS_MCP_PRODUCT.md](./DENARIUS_MCP_PRODUCT.md) para el contrato completo.

## Límites de la beta

- Acceso por cohortes pequeñas y onboarding acompañado.
- No hay lanzamiento autoservicio masivo.
- El puente desktop todavía no se publica en npm.
- No hay ejecución de pagos ni automatización financiera irreversible.
- Las métricas de experiencia no recopilan contenido financiero ni PII.
- Toda escritura conversacional exige permisos y confirmación del cliente.

## Dirección de producto

1. Operar la beta y medir activación, tiempo hasta primera decisión, cierre semanal, resolución de alertas y adopción del MCP.
2. Mejorar integraciones y automatizar la frescura de fuentes sin degradar trazabilidad.
3. Fortalecer recomendaciones y comparación entre impacto esperado y resultado.
4. Certificar el puente desktop y preparar publicación reproducible en npm.
5. Ampliar capacidades conversacionales solo con preview, aprobación, idempotencia y comprobante.

La expansión mantiene como invariantes el aislamiento entre empresas, la seguridad de la identidad compartida, la evidencia de cada cifra y la posibilidad de operar Denarius sin depender del chatbot.

## Criterio de readiness

La release `2026-08-11-denarius-beta-rc1` obtuvo GO condicionado para beta cerrada. La puerta incluye suite local y build, roles y aislamiento, happy flows PyME/Startup, equipo, MCP OAuth/API key, observabilidad, soporte, experiencia, frescura y limpieza cero huella. La decisión detallada vive en [docs/certification/GO_NO_GO_BETA_2026-08-11.md](./docs/certification/GO_NO_GO_BETA_2026-08-11.md).
