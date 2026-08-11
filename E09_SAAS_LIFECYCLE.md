# E09.2 · Ciclo de vida SaaS

## Alcance entregado

- Upgrade y downgrade mediante cambios de MRR.
- Cambio de plan asociado al movimiento.
- Churn y reactivación fechados.
- Nota operativa opcional para el equipo financiero.
- Historial cronológico inmutable por suscripción.
- Registro de MRR y plan anterior/nuevo en cada evento.

## Criterios aceptados

- Una suscripción activa exige MRR mayor que cero.
- Un cambio activo sin variación de MRR se rechaza.
- Una suscripción ya churned no puede volver a registrar churn.
- La reactivación genera un evento nuevo; no modifica el churn anterior.
- Todas las RPC validan la identidad y la propiedad del registro.
- El historial solo puede leerse; no existe operación de edición o borrado.

## No incluido

- Prorrateo diario o reconocimiento contable de ingresos.
- Cobros, facturas o sincronización con pasarelas de pago.
- Aprobaciones multinivel para cambios contractuales.
- Eliminación de eventos financieros.

## Verificación

El test remoto crea dos suscripciones, registra expansión, churn y reactivación, comprueba las métricas y el historial y elimina el usuario temporal con todos sus datos.
