# E08 · Dashboard adaptativo y diagnóstico de modelo

## Objetivo

Evitar que PyME Tradicional y Startup SaaS conduzcan a la misma experiencia. Denarius realiza un diagnóstico breve, recomienda una vista, explica el resultado y conserva la decisión por empresa.

## Flujo

1. El usuario autenticado entra a `/dashboard`.
2. Si la empresa no tiene un diagnóstico confirmado, responde seis preguntas.
3. Denarius puntúa señales PyME y Startup SaaS.
4. Se presenta recomendación, confianza y razones.
5. El usuario confirma o corrige la recomendación.
6. La decisión y las respuestas se guardan en `cashflow.tenant`.
7. `/dashboard` renderiza el layout y las métricas del modelo confirmado.
8. `/operations` mantiene cuentas, facturas, movimientos, recurrencias y proyección detallada.

## Criterios de aceptación

- El diagnóstico no pregunta directamente “¿eres PyME o Startup?” como única decisión.
- Todas las preguntas tienen una alternativa neutral o mixta.
- La recomendación es determinista, explicable y nunca bloquea la elección manual.
- Un empate comienza con PyME Tradicional como opción conservadora, indicando confianza baja.
- El modelo se persiste en el tenant y no depende únicamente de `localStorage`.
- Cambiar el modelo desde el switcher también persiste la decisión.
- PyME consume `metrics_pyme` y su layout específico.
- Startup SaaS consume `metrics_saas` y su layout específico.
- Las operaciones existentes permanecen disponibles en `/operations`.
- Los enlaces profundos del copiloto conducen a `/operations`.
- El diagnóstico funciona con teclado y presenta progreso visible.

## No aceptado

- Inferir el modelo mediante IA opaca o texto libre en este incremento.
- Guardar respuestas antes de la confirmación final.
- Eliminar o esconder las funciones operativas existentes.
- Permitir modificar empresas de otro usuario mediante el RPC.
- Usar datos del diagnóstico para entrenamiento de modelos.

## Persistencia

- `business_model`: modelo confirmado.
- `business_model_source`: `diagnostic` o `manual`.
- `business_model_diagnosed_at`: fecha de confirmación.
- `business_profile`: respuestas estructuradas del diagnóstico.

La escritura usa `cashflow.set_business_model_profile`, que verifica `auth.uid()` y propiedad del tenant.
