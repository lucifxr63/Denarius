# DEN-110 — Fundamentos UX/UI del producto

## Objetivo

Reducir la carga cognitiva del usuario y mantener una navegación consistente mientras Denarius incorpora nuevas capacidades financieras y MCP.

## Decisión de navegación

- Tareas principales siempre visibles en escritorio: **Resumen**, **Operaciones**, **Alertas** y **Cierre**.
- Capacidades de configuración y soporte agrupadas en **Más**: conexión MCP, suscripciones, calidad de datos y soporte beta.
- El selector Startup/Pyme conserva su contexto, y Suscripciones solo aparece para Startup SaaS.
- Tutorial, Ajustes y Cerrar sesión se consideran acciones de contexto, no navegación principal.

## Criterios de aceptación implementados

- Cabecera compartida en Resumen, Operaciones, Alertas, Cierre, Suscripciones, Conexiones MCP, Calidad de datos y Soporte.
- Estado activo identificable sin depender solo de iconos.
- Controles principales con objetivo táctil mínimo de 44 px.
- Foco de teclado visible y regiones `nav` etiquetadas.
- Menú móvil sin desbordamiento horizontal a 375 px.
- El cambio no modifica consultas, tablas, RLS ni contratos del MCP.

## Próximos refinamientos

- Retirar progresivamente el markup legado de cabeceras locales, ya reemplazado visualmente por el shell común.
- Prueba de usabilidad moderada con 5 usuarios de startups/pymes.
- Auditoría WCAG 2.2 AA y Core Web Vitals en producción.
- Atajos orientados a intención: registrar movimiento, revisar alerta y cerrar semana.

## Incremento de dashboard orientado a decisiones

- Startup SaaS muestra primero seis señales: burn neto, runway, MRR, crecimiento MRR, MRR en riesgo y renovaciones vencidas.
- Los indicadores restantes siguen disponibles bajo “Análisis avanzado”; no se eliminan ni se cambia su fuente.
- El centro de acciones enlaza registro operativo, alertas, cierre semanal y calidad de datos.
- La cantidad de señales que requieren revisión se deriva de tonos `warning` y `negative` calculados por el motor de métricas.

## Incremento de Operaciones por tareas

- Índice interno: Resumen, Proyección, Cobranza y fijos, Registrar, Importar e Historial.
- Cada destino tiene un anclaje estable para deep links desde el dashboard y el MCP.
- Los bloques incorporan una explicación breve antes de sus controles.
- La navegación permanece visible al desplazarse, usa objetivos táctiles de 44 px y se adapta de 2 a 6 columnas.

## Incremento de formularios y estados vacíos

- Etiquetas y foco reforzados en factura y movimiento.
- Carga de PDF operable con Enter y Espacio, con errores anunciados.
- Estados vacíos explicativos con acceso directo al registro.
- Acciones de facturas y movimientos visibles en móvil y durante navegación por teclado.
- Importador CSV guiado en cuatro fases: archivo, mapeo, análisis y confirmación.

## Incremento de Alertas y Cierre

- Cola de trabajo filtrable por todas, críticas y advertencias.
- Cada alerta muestra prioridad, impacto monetario, fecha relevante y acción profunda.
- Estado vacío específico para cada filtro.
- Alertas y Cierre comparten el recorrido Verificar datos → Resolver alertas → Registrar cierre.
- El filtrado ocurre en memoria sobre la respuesta aislada de `financial_alert_center`; no crea nuevas consultas ni persistencia.

## Incremento de confirmación del cierre semanal

- La preparación muestra porcentaje, verificaciones completas, fecha de corte y accesos a datos o alertas pendientes.
- El usuario revisa un resumen explícito del snapshot antes de registrarlo.
- El cierre exige reconocimiento mediante checkbox y una segunda confirmación contextual.
- Las alertas críticas no bloquean el contrato existente: el cierre se registra como “con riesgos” y conserva una ruta visible para resolverlas.
- La mejora no modifica tablas, RLS, consultas ni el contrato MCP.

## Incremento de modelo, fuentes y resultado

> Este flujo se complementa con el alta de empresa descrita al final del documento.

- El modelo Startup/PyME pertenece a la empresa y se presenta como contexto bloqueado para miembros normales.
- Los cambios manuales requieren `app_metadata.denarius_role = platform_admin`, sin modificar el perfil compartido con otros productos.
- PyME usa facturas por cobrar como ventas; aportes y movimientos bancarios no inflan ingresos.
- Los supuestos unitarios guardados vuelven precargados al abrir el cierre.
- El cierre entrega comparación contra la semana anterior y tres acciones específicas del modelo.
