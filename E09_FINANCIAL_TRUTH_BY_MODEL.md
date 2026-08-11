# E09 · Verdad financiera por modelo — incremento 1

## Objetivo

Dashboard adaptativo, Operaciones y copiloto deben compartir exactamente la misma caja, burn y runway.

## Fuente canónica

`cashflow.financial_core_metrics(tenant, fecha)` calcula:

- caja actual;
- burn bruto;
- burn neto mensual;
- neto mensual;
- runway;
- período trailing de 90 días.

El cálculo combina movimientos reales de los últimos 90 días y reglas recurrentes normalizadas a equivalente mensual. Los ingresos aplican la reserva tributaria configurada para el tenant.

## Primer conjunto Startup SaaS

- Burn neto.
- Burn bruto.
- Runway.
- MRR.
- Crecimiento neto de MRR.
- Burn multiple.
- Tendencia de burn.
- Caja bancaria.

## Criterios de aceptación

- `metrics_saas` consume `financial_core_metrics` para burn, runway y caja.
- `denarius-tools` consume la misma RPC para las respuestas del copiloto.
- Ningún solicitante puede consultar métricas de otro tenant.
- Dashboard SaaS y copiloto entregan el mismo burn y runway.
- Un período sin crecimiento de MRR muestra “Sin crecimiento” y no divide por cero.
- Burn multiple menor o igual a 1 es positivo; entre 1 y 2 es advertencia; mayor que 2 es negativo.
- Los cálculos continúan funcionando cuando no existen movimientos o recurrencias.

## Fuera de este incremento

- Cohortes de suscripciones y churn por cliente.
- CAC y LTV basados en adquisición.
- Aging, DSO, DPO e inventario PyME.
- Generación automática de datasets demo por tenant.

Estos elementos continúan en los siguientes cortes de E09 una vez certificada la fuente financiera común.
