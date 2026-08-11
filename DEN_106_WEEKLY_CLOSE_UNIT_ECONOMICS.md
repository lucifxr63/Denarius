# DEN-106 · Cierre semanal y unit economics

El cierre semanal crea un snapshot auditable de caja, burn, runway, alertas y unit economics. Si existen alertas críticas, el cierre se registra `CLOSED_WITH_RISKS`; nunca oculta ni resuelve riesgos automáticamente.

Para Startup SaaS se calculan ARPA, margen bruto, CAC, LTV, LTV/CAC y payback. La señal saludable exige LTV/CAC ≥ 3, payback ≤ 12 meses, churn mensual ≤ 5% y margen positivo.

Para PyME se calcula ingreso por cliente, costo de adquisición, margen de contribución y retorno sobre CAC. La señal saludable exige margen de contribución ≥ 30% e ingreso por cliente superior al CAC.

`INCOMPLETE` significa que faltan supuestos y no es una conclusión de inviabilidad. `UNVIABLE` sólo aparece cuando los datos completos muestran contribución nula/negativa o una recuperación claramente insuficiente.
