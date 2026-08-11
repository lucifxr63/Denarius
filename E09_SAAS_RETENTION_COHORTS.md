# E09.3 · Retención y cohortes SaaS

## Métricas

- **NRR:** `(MRR inicial + expansión - contracción - churn) / MRR inicial`.
- **GRR:** `(MRR inicial - contracción - churn) / MRR inicial`, limitada a 0–100%.
- **Logo churn:** clientes perdidos / clientes activos al inicio del mes.
- **Retención de cohorte:** MRR actual / MRR inicial de las altas de un mismo mes.

Nuevo MRR y reactivaciones del mes no se incluyen en la base de NRR o GRR. Cuando no existe base inicial, Denarius devuelve `null` y la interfaz muestra “sin dato”.

## Entrega

- RPC multi-tenant `saas_retention_metrics` con ventana de 1 a 24 meses.
- Evolución mensual de NRR en el dashboard Startup SaaS.
- Widgets de NRR, GRR y logo churn.
- Resumen de retención y tabla de cohortes en `/subscriptions`.
- Prueba remota con una cohorte del mes anterior, expansión actual y limpieza en cascada.

## Fuera de alcance

- Cohortes semanales o diarias.
- Segmentación por canal, industria o ejecutivo.
- Predicción probabilística de churn.
- Reconocimiento contable de ingresos.
