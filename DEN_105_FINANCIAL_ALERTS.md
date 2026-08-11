# DEN-105 · Centro de alertas financieras

## Objetivo

Convertir métricas existentes en señales priorizadas y accionables sin duplicar datos ni romper la base compartida con Validus, Licitus y Animus.

## Contrato actual

`cashflow.financial_alert_center(tenant, fecha)` calcula alertas en tiempo real y devuelve resumen, severidad, evidencia agregada y enlace de resolución. Cubre caja negativa, runway bajo, cobranza vencida, reserva tributaria, concentración SaaS y renovaciones.

Las reglas críticas son: caja negativa; runway menor a 3 meses; cobranza con 30 días o más de atraso; reserva tributaria mayor a caja; o renovaciones vencidas. El rango de advertencia cubre runway de 3 a menos de 6 meses y los restantes umbrales preventivos.

## Privacidad y aceptación

- El RPC valida `auth.uid()` y propiedad del tenant.
- No persiste alertas derivadas ni cambia tablas compartidas.
- El payload usa agregados; no expone nombres de clientes o contactos.
- Cada alerta abre una superficie donde el usuario puede resolverla.

## Siguiente evolución

Agregar preferencias por umbral y canal, acuses e historial de resolución, y exponer una lectura equivalente en el MCP una vez estabilizado el contrato web.
