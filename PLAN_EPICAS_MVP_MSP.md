# Documento histórico — reemplazado por el backlog MCP

> **Corrección:** MCP significa Model Context Protocol. Las referencias a “MSP”
> corresponden a una interpretación anterior. Usar `BACKLOG_DENARIUS_MCP.md` y
> `DENARIUS_MCP_PRODUCT.md` como fuentes vigentes.

# Plan por épicas — de Denarius MVP a Denarius MSP

> Versión inicial: 2026-08-06
> Objetivo: completar un MVP confiable y lanzar cuanto antes un MSP conversacional
> seguro, inicialmente de solo lectura y luego con acciones controladas.

## 1. Resultado objetivo

Denarius debe pasar por tres estados comerciales:

1. **MVP confiable:** registra y proyecta caja con datos consistentes.
2. **Copiloto financiero:** responde preguntas con evidencia desde web/desktop.
3. **MSP operativo:** monitorea empresas, propone acciones y ejecuta operaciones
   autorizadas con trazabilidad.

La prioridad no es construir “un chatbot” aislado. La prioridad es crear una fuente
de verdad y un conjunto de herramientas financieras seguras que puedan ser usadas
por la web, el chatbot cloud, desktop y la futura consola MSP.

## 2. Principios de ejecución

- Una sola fuente de verdad: PostgreSQL/Supabase, nunca la memoria del chat.
- Primero lectura; escrituras del agente solo después de auditoría e idempotencia.
- Toda métrica debe indicar tenant, fecha de corte, moneda y fuente.
- Toda acción financiera sensible requiere permisos y confirmación explícita.
- El MVP debe concentrarse en un segmento inicial, aunque la arquitectura soporte
  PyME y startup SaaS.
- Las épicas se cierran con criterios verificables, no solo con pantallas.

## 3. Mapa de épicas

| ID | Épica | Resultado | Prioridad | Dependencias |
|---|---|---|---|---|
| E00 | Definición comercial y alcance | Segmento, oferta y límites del MSP | P0 | — |
| E01 | Estabilización técnica | Base compilable, observable y testeada | P0 | E00 |
| E02 | Fuente de verdad financiera | Esquema y métricas certificadas | P0 | E01 |
| E03 | Experiencia MVP unificada | Un único producto configurable | P0 | E02 |
| E04 | Ingesta y conciliación | Menos carga manual, sin duplicados | P0 | E02 |
| E05 | Alertas y cierre financiero | Uso recurrente y valor proactivo | P1 | E02, E04 |
| E06 | API de herramientas financieras | Contratos reutilizables por cualquier canal | P0 MSP | E02 |
| E07 | Copiloto de solo lectura | Chat con respuestas trazables | P0 MSP | E05, E06 |
| E08 | Identidad, roles y auditoría | Operación multiusuario y MSP segura | P0 MSP | E02, E06 |
| E09 | Acciones conversacionales | Escrituras confirmadas e idempotentes | P1 MSP | E07, E08 |
| E10 | Consola MSP multiempresa | Monitoreo y operación por cartera | P1 MSP | E05, E08, E09 |
| E11 | Predictivo e integraciones avanzadas | Forecast, SII, bancos y ERP | P2 | E04–E10 |

## 4. Épicas detalladas

### E00 — Definición comercial y alcance operativo

**Objetivo:** impedir que el producto intente resolver simultáneamente todos los
casos PyME, SaaS y MSP.

**Entregables:**

- Segmento de entrada definido: recomendación inicial, PyME chilena de servicios
  con 1–20 personas y operación bancaria simple.
- Usuario comprador y usuario operador definidos.
- Lista de cinco decisiones principales que Denarius debe mejorar.
- Oferta del MVP, oferta del copiloto y oferta del servicio MSP.
- Matriz “solo lectura / requiere confirmación / prohibido automatizar”.
- Modelo MSP definido: autoservicio, humano asistido por IA o híbrido.
- Métricas baseline: tiempo de cierre semanal, forecast, mora y trabajo manual.

**Criterio de salida:** existe un documento de alcance aprobado; toda historia nueva
puede asociarse a un problema y una métrica del segmento inicial.

**Esfuerzo orientativo:** 1 semana calendario, en paralelo con E01.

### E01 — Estabilización técnica y observabilidad

**Objetivo:** que el MVP pueda cambiarse y desplegarse sin introducir errores
silenciosos.

**Entregables:**

- Inventario de frontend, Supabase, Edge Functions, dominios y repositorios.
- Certificación del estado real de producción.
- CI con lint, TypeScript, build, pruebas y preview.
- Pruebas unitarias del motor de proyección y vencimientos asimétricos.
- Pruebas de integración de RLS y aislamiento cross-tenant.
- Sentry con release, entorno y contexto de tenant sin datos financieros sensibles.
- Code splitting por rutas y presupuesto de bundle.
- Estrategia segura de migraciones y rollback.
- Eliminación o actualización de documentación contradictoria.

**Criterio de salida:** cada cambio pasa una pipeline automática; producción puede
reproducirse; un fallo de carga, RPC o proyección es observable.

**Esfuerzo orientativo:** 2–3 semanas-persona.

### E02 — Fuente de verdad financiera y base de datos

**Objetivo:** asegurar que web, chatbot y MSP obtengan exactamente los mismos
resultados.

**Entregables:**

- Confirmación y despliegue de la migración `20260624120000`.
- Regeneración de `database.types.ts` con `business_model`, `ppm_rate` y RPC.
- Contratos versionados para `metrics_pyme` y `metrics_saas`.
- Eliminación de mocks en producción.
- Moneda base y reglas de conversión definidas por tenant.
- Modelo de períodos y fecha de corte consistente.
- Ledger o reglas explícitas de mutabilidad para movimientos financieros.
- Integridad para evitar tenant/account/owner inconsistentes.
- Índices, límites, paginación y pruebas de rendimiento.
- Dataset demo reproducible para QA y ventas.

**Criterio de salida:** una misma empresa produce métricas idénticas desde RPC,
dashboard y pruebas; no existe fallback silencioso a datos ficticios.

**Esfuerzo orientativo:** 3–4 semanas-persona.

### E03 — Experiencia MVP unificada

**Objetivo:** convertir `/dashboard`, `/saas` y `/workspace` en una experiencia
coherente y vendible.

**Entregables:**

- Canvas configurable como shell principal.
- Onboarding: empresa, modelo, moneda, saldo, recurrencias y primera proyección.
- Navegación unificada para cuentas, movimientos, facturas y configuración.
- Widgets PyME y SaaS conectados únicamente a datos reales.
- Estados vacíos, carga, degradación y recuperación de errores.
- Centro de resolución de facturas y datos incompletos.
- Accesibilidad responsive y funcionamiento desktop/PWA.
- Instrumentación del funnel de activación.

**Criterio de salida:** un usuario nuevo obtiene una proyección entendible y una
acción recomendada sin soporte manual.

**Esfuerzo orientativo:** 4–5 semanas-persona.

### E04 — Ingesta, conciliación y prevención de duplicados

**Objetivo:** reducir la carga manual, principal riesgo de abandono del MVP.

**Entregables:**

- Importador CSV bancario con preview y mapeo de columnas.
- Perfiles reutilizables por banco/formato.
- Clave de idempotencia y fingerprint de movimientos.
- Conciliación entre movimiento, factura y recurrencia.
- Reglas para evitar doble conteo de eventos fantasma y pagos reales.
- PDF de facturas con revisión humana antes de persistir.
- Límites, TTL de archivos y registro de costo del parser.
- Bandeja de elementos importados, aceptados, duplicados y rechazados.
- Diseño del adaptador futuro para Open Banking.

**Criterio de salida:** importar el mismo archivo dos veces no duplica datos; un
movimiento conciliado sustituye correctamente la expectativa proyectada.

**Esfuerzo orientativo:** 4–6 semanas-persona.

### E05 — Alertas y cierre financiero recurrente

**Objetivo:** hacer que Denarius entregue valor sin que el usuario tenga que abrir
el dashboard todos los días.

**Entregables:**

- Motor de reglas: caja bajo umbral, factura vencida, runway crítico, impuesto y
  desviación contra proyección.
- Centro de notificaciones dentro de Denarius.
- Resumen semanal por correo y, posteriormente, otros canales.
- Workflow de cierre semanal con checklist y fecha de corte.
- Recomendaciones con prioridad, impacto y evidencia.
- Preferencias, horarios, frecuencia y silenciamiento por tenant.
- Historial de alerta → acción → resultado.

**Criterio de salida:** el sistema detecta anticipadamente una condición de riesgo,
notifica una vez y permite medir si fue resuelta.

**Esfuerzo orientativo:** 3–4 semanas-persona.

### E06 — API y catálogo de herramientas financieras

**Objetivo:** crear la superficie estable que utilizarán web, cloud, desktop y el
agente. Es la épica habilitadora central del MSP.

**Entregables:**

- BFF/API Gateway autenticado; el agente no consulta tablas directamente.
- OpenAPI o contratos equivalentes versionados.
- Herramientas de lectura:
  - `get_cash_position`
  - `get_cash_projection`
  - `get_runway_and_burn`
  - `list_overdue_invoices`
  - `explain_metric`
  - `simulate_scenario`
  - `get_restricted_cash`
  - `get_financial_summary`
- Respuestas con `tenant_id`, `as_of`, moneda, fuentes y confianza.
- Autorización por herramienta y tenant.
- Rate limits, timeouts, trazas y errores estructurados.
- Pruebas de contrato y cliente SDK TypeScript.

**Criterio de salida:** un cliente externo autenticado puede responder las preguntas
principales sin conocer el esquema interno ni saltarse RLS.

**Esfuerzo orientativo:** 3–5 semanas-persona.

### E07 — Copiloto financiero de solo lectura

**Objetivo:** lanzar la primera experiencia MSP rápidamente y con riesgo limitado.

**Entregables:**

- Chat embebido en Denarius.
- Cliente cloud y experiencia desktop/PWA sobre la misma API.
- Orquestador que solo utiliza el catálogo de E06.
- Resolución explícita de empresa activa y período.
- Respuestas con citas internas a métricas, facturas y movimientos.
- Historial de conversaciones persistido por tenant.
- Acciones sugeridas que abren la pantalla correcta, sin escribir datos.
- Evaluaciones: exactitud, selección de herramienta, aislamiento y rechazo seguro.
- Protección contra prompt injection contenido en archivos o campos importados.

**Criterio de salida:** el copiloto responde un set de preguntas doradas con datos
correctos y nunca mezcla empresas ni afirma haber modificado información.

**Esfuerzo orientativo:** 4–5 semanas-persona.

### E08 — Identidad empresarial, roles y auditoría

**Objetivo:** soportar equipos, contadores y operadores MSP sin compartir cuentas.

**Entregables:**

- Migración de propietario único a membresías por organización/tenant.
- Roles mínimos: owner, admin financiero, operador, contador, lector y MSP.
- Invitaciones, revocación y cambio de empresa activa.
- Autorización consistente en RLS, API y herramientas.
- Bitácora inmutable de consultas y mutaciones.
- Consentimiento para acceso MSP y revocación inmediata.
- Política de retención, exportación y eliminación.
- Reautenticación para acciones sensibles.

**Criterio de salida:** un operador MSP puede acceder únicamente a empresas con
mandato vigente; toda acción queda atribuida a una identidad humana y sesión.

**Esfuerzo orientativo:** 4–6 semanas-persona.

### E09 — Acciones conversacionales controladas

**Objetivo:** permitir que el agente actualice Denarius sin perder control humano.

**Entregables:**

- Herramientas de escritura separadas de las de lectura.
- Primer alcance recomendado:
  - crear borrador de factura;
  - categorizar movimiento;
  - crear escenario;
  - ajustar recurrencia;
  - marcar recomendación como resuelta.
- Flujo propuesta → preview → confirmación → ejecución → comprobante.
- Idempotency key obligatoria.
- Optimistic concurrency/versionado para evitar pisar cambios.
- Rollback o operación compensatoria cuando corresponda.
- Límites monetarios y políticas por rol.
- Suite de evaluaciones adversariales y de duplicación.

**Fuera del primer alcance:** iniciar pagos bancarios, presentar impuestos, borrar
historial contable o cambiar permisos mediante lenguaje natural.

**Criterio de salida:** repetir, recargar o reintentar una orden no genera una
segunda operación; el usuario puede ver exactamente qué cambió.

**Esfuerzo orientativo:** 4–6 semanas-persona.

### E10 — Consola MSP multiempresa

**Objetivo:** operar una cartera de empresas con foco en excepciones y SLA.

**Entregables:**

- Lista de empresas con salud de datos, caja, riesgos y última actualización.
- Bandeja priorizada de alertas y tareas.
- Vista 360 de empresa y salto al chat con contexto explícito.
- Asignación de empresas y casos a operadores.
- Notas internas, comunicación al cliente y seguimiento.
- SLA, escalamiento y estados de caso.
- Reportes de actividad, valor generado y horas ahorradas.
- Controles para impedir exportaciones masivas no autorizadas.

**Criterio de salida:** un operador gestiona varias empresas sin cruzar datos y el
responsable puede auditar carga, respuesta e impacto.

**Esfuerzo orientativo:** 5–7 semanas-persona.

### E11 — Predictivo e integraciones avanzadas

**Objetivo:** aumentar anticipación y automatización después de validar el MSP.

**Entregables posibles:**

- Open Banking y sincronización incremental.
- SII/facturación electrónica y calendario tributario real.
- ERP y software contable.
- Forecast probabilístico con intervalos de confianza.
- Detección de anomalías y concentración de riesgo.
- Benchmarks agregados y anonimizados.
- Workflows aprobables para cobranza, presupuesto y cierre mensual.

**Criterio de entrada:** el MVP y el copiloto tienen uso recurrente, datos de calidad
y una métrica de negocio demostrable. No debe bloquear el primer MSP.

## 5. Secuencia acelerada recomendada

### Ola A — fundamento del MVP

E00 + E01 → E02

Objetivo: producto desplegable, base certificada y métricas reales.

### Ola B — MVP vendible

E03 + primera parte de E04 + E05

Objetivo: onboarding, dashboard unificado, importación CSV, conciliación inicial y
resumen semanal.

### Ola C — primer MSP

E06 + E08 básica → E07

Objetivo: API financiera, permisos mínimos y copiloto de solo lectura. Esta es la
primera versión que debe mostrarse como “Denarius MSP”.

### Ola D — MSP operativo

E08 completa → E09 → E10

Objetivo: acciones confirmadas, acceso delegado y consola multiempresa.

### Ola E — diferenciación

E11

Objetivo: predicción, conectores y automatizaciones avanzadas.

## 6. Primer release MSP recomendado

Para llegar lo antes posible, el release inicial debe limitarse a:

- Chat web y PWA/desktop instalable.
- Consultas de caja, runway, burn, vencimientos, reserva y proyección.
- Simulaciones que no persisten cambios financieros.
- Historial de conversaciones en Denarius.
- Respuestas con fuentes y fecha de corte.
- Alertas semanales y enlaces profundos al dashboard.
- Sin pagos, sin borrados y sin escrituras contables desde el chat.

Este alcance permite validar si los usuarios realmente prefieren conversar con sus
datos antes de construir la parte más costosa y riesgosa del MSP.

## 7. Plan de releases

| Release | Contenido | Señal de éxito |
|---|---|---|
| R0 — Base estable | E01 + E02 | Build, pruebas y métricas reales sin mocks |
| R1 — MVP financiero | E03 + E04 mínima | Primera proyección confiable en una sesión |
| R2 — MVP proactivo | E05 | Empresas completan cierre semanal |
| R3 — MSP Read-only | E06 + E07 + E08 básica | Preguntas correctas con evidencia y cero cruces |
| R4 — MSP Actions | E08 + E09 | Acciones confirmadas sin duplicación |
| R5 — MSP Portfolio | E10 | Operador gestiona cartera con SLA |

## 8. Equipos y paralelización sugerida

Con un equipo pequeño, separar tres frentes:

- **Producto financiero:** reglas, UX, onboarding, cierre y validación con clientes.
- **Plataforma de datos:** Supabase, RLS, RPC, ingesta, conciliación y API.
- **Agente/MSP:** herramientas, evaluaciones, historial, chat y consola.

Producto y plataforma comienzan en E00–E02. El frente de agente puede diseñar
contratos y evaluaciones, pero no debe implementar escrituras antes de E06/E08.

## 9. Definición de terminado transversal

Una historia financiera está terminada únicamente cuando:

- tiene criterio de negocio y caso borde;
- respeta aislamiento por tenant y rol;
- incluye prueba automática;
- genera trazabilidad y error observable;
- funciona en estados vacío, carga, éxito y fallo;
- actualiza documentación/contrato;
- tiene métrica de adopción o resultado;
- no utiliza mocks en producción salvo un modo demo explícito.

## 10. Riesgos principales

| Riesgo | Mitigación |
|---|---|
| Construir chat antes de ordenar datos | E02 y E06 son puertas obligatorias |
| Mezcla de datos entre empresas | RLS, roles, pruebas cross-tenant y evaluaciones |
| Operaciones duplicadas | Idempotencia, fingerprint y conciliación |
| Métricas inconsistentes | RPC versionadas como fuente única |
| Exceso de alcance PyME + SaaS | Segmento inicial definido en E00 |
| Dependencia del ingreso manual | CSV y conciliación en E04 |
| IA que ejecuta acciones incorrectas | Solo lectura primero; confirmación y límites |
| Supabase compartido con Validus | Inventario, aislamiento y plan de separación |
| Costo de soporte MSP | Consola por excepciones, SLA y automatización gradual |

## 11. Métricas de control del programa

- Tiempo hasta primera proyección confiable.
- Error de proyección a 30 días.
- Porcentaje de movimientos conciliados.
- Empresas que completan cierre semanal.
- Preguntas del copiloto respondidas correctamente.
- Porcentaje de respuestas con fuentes completas.
- Cruces de tenant detectados: objetivo absoluto cero.
- Acciones duplicadas: objetivo absoluto cero.
- Tiempo ahorrado por empresa y operador MSP.
- Riesgos de caja detectados con anticipación.

## 12. Próxima acción

Iniciar un sprint cero con E00, E01 y la auditoría remota de E02. Al cierre del
sprint deben quedar priorizadas las historias de R0, una matriz de permisos del
futuro agente y un dataset demo que permita probar el flujo completo.
