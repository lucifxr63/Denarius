# DEN-114 — Alta y contexto de empresa

## Resultado

El alta separa la identidad compartida de la configuración propia de Denarius. Google resuelve autenticación; Denarius crea y configura el espacio financiero de la empresa sin modificar perfiles de Validus, Licitus o Animus.

## Flujo

1. Autenticación con Google.
2. Nombre y contexto de empresa.
3. Diagnóstico Startup/PyME.
4. Línea base financiera.

La beta declara su alcance actual: Chile, CLP y `America/Santiago`. La selección internacional queda en backlog para evitar prometer conversiones o reglas fiscales aún no implementadas.

## Datos y consentimiento

- Se solicita nombre de empresa; todavía no se pide RUT, teléfono ni tarjeta.
- Términos y privacidad tienen rutas públicas y aceptación explícita versionada.
- Los tenants existentes se marcan como contextualizados para no interrumpirlos.
- No se fabrican aceptaciones legales retroactivas para usuarios existentes.
- La escritura se limita al tenant cuyo `owner_id` coincide con `auth.uid()`.

## Aceptación

- Una cuenta nueva no llega al diagnóstico sin completar el contexto.
- No se puede guardar sin aceptar términos y privacidad.
- El resumen anticipa qué se creará y cuál es el siguiente paso.
- La migración no altera `profiles` ni `auth.users`.
