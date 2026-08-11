# DEN-104 — Onboarding financiero accionable

## Resultado esperado

Una empresa nueva termina su primera sesión con modelo recomendado, cuenta inicial, saldo actual, ingresos/costos recurrentes y dashboard capaz de proyectar caja.

## Recorrido

1. Seis preguntas determinan Startup SaaS o PyME Tradicional.
2. El usuario confirma o corrige la recomendación.
3. Registra saldo disponible, ingreso mensual, costos fijos y primer mes proyectado.
4. Un único RPC autenticado crea cuenta y recurrencias o revierte todo ante un error.
5. Denarius abre el dashboard del modelo elegido con datos reales editables.

Los usuarios que ya tienen una cuenta continúan directamente al dashboard y no repiten el recorrido.

## Límites

- Moneda inicial CLP; la multimoneda pertenece a `DEN-108`.
- No acepta importes negativos ni una proyección sin ingresos y sin costos.
- El primer evento debe estar entre hoy y 62 días.
- El cliente nunca envía `owner_id`; se resuelve mediante `auth.uid()`.
- No se crean datos demo silenciosamente.
