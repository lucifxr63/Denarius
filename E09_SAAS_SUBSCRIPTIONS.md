# E09 · Suscripciones y crecimiento SaaS

## Resultado

Denarius registra clientes, planes, suscripciones y movimientos de MRR por empresa. El dashboard Startup SaaS consume ese historial para mostrar MRR contractual, nuevo MRR, expansión, churn, revenue churn y clientes activos.

## Reglas aceptadas

- Cada alta genera un evento `NEW`.
- Los cambios de valor generan `EXPANSION` o `CONTRACTION`.
- La baja genera `CHURN`; una vuelta genera `REACTIVATION`.
- El MRR se reconstruye desde eventos y no desde valores demo.
- Todas las entidades están aisladas por `tenant_id`, `owner_id` y RLS.
- Las escrituras se realizan mediante RPC autenticadas y verifican propiedad.

## Fuera de alcance de este incremento

- Facturación o cobro automático.
- Integración con Stripe, bancos o CRM.
- Edición avanzada de contratos y múltiples monedas.
- Revenue recognition contable, impuestos o prorrateos diarios.

## Criterios de aceptación verificados

- Alta de cliente, plan y suscripción desde `/subscriptions`.
- Registro y clasificación de eventos MRR.
- Cálculo del MRR final después de expansión y churn.
- Conteo de clientes y suscripciones activas.
- Acceso visible solo en el workspace Startup SaaS.
- Prueba de integración remota con usuario temporal y eliminación en cascada.
- Suite local: 41 pruebas y build productivo aprobados.
