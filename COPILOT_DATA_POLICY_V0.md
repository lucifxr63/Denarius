# Política v0 de datos del Copiloto Denarius

## Estado y alcance

Esta política es una propuesta técnica para aprobar antes de persistir historial.
La versión actual del copiloto mantiene la conversación solo en memoria del
navegador y la descarta al recargar o cerrar la página.

## Principios obligatorios

- Minimización: guardar únicamente lo necesario para continuidad y auditoría.
- Aislamiento: toda fila pertenece a un tenant y usuario autenticado bajo RLS.
- Transparencia: la interfaz indica si una conversación se guarda o es temporal.
- Control: el usuario puede desactivar historial y eliminar conversaciones.
- Propósito limitado: no reutilizar conversaciones financieras para entrenar
  modelos sin un consentimiento separado, explícito y revocable.
- Privilegio mínimo: el modelo nunca recibe service-role ni elige `tenant_id`.

## Datos permitidos

- Identificador de conversación, tenant, usuario creador y timestamps.
- Texto escrito por el usuario y respuesta mostrada por el copiloto.
- Herramienta invocada, estado, fecha de corte y referencias no sensibles.
- Versión del contrato/orquestador y consentimiento aplicable.

## Datos no permitidos

- Tokens, claves, contraseñas, cookies o credenciales.
- Service-role, JWT o cabeceras de autorización.
- Payload completo de tablas financieras usado internamente por herramientas.
- Contenido bruto de PDFs cuando no sea indispensable para la respuesta.
- Datos de otra empresa o datos fuera del mandato del usuario.

## Consentimiento propuesto

- Historial desactivado por defecto durante el piloto.
- Activación mediante control explícito con finalidad y plazo visibles.
- Consentimiento versionado con actor, tenant, fecha y estado.
- Revocación inmediata para nuevas conversaciones.
- La revocación no reemplaza la eliminación: ambas acciones deben estar separadas.

## Retención propuesta

- Conversaciones temporales: solo memoria de la pestaña.
- Historial activado: 90 días desde la última actividad.
- Auditoría mínima de herramienta sin payload financiero: 180 días.
- Eventos de seguridad: plazo separado aprobado por seguridad/legal.
- Un job programado elimina datos vencidos y registra conteos, nunca contenido.

## Eliminación y exportación

- El usuario puede eliminar una conversación o todo su historial del tenant.
- Eliminación lógica no es suficiente para mensajes; debe existir purga física.
- La eliminación debe incluir adjuntos derivados y referencias secundarias.
- Exportación estructurada en JSON con fechas, mensajes y fuentes mostradas.
- Toda operación devuelve comprobante con `request_id`, alcance y fecha.

## Seguridad y observabilidad

- RLS por tenant y actor; el acceso delegado requiere autorización vigente.
- Cifrado en tránsito y reposo provisto por la plataforma.
- Logs operacionales sin texto de conversación ni montos financieros.
- Protección contra instrucciones alojadas en PDFs y campos importados: se tratan
  como datos, nunca como instrucciones del sistema.
- Métricas agregadas: latencia, errores, herramienta y volumen; sin contenido.

## Criterios para habilitar historial

1. Política aprobada por responsable de producto y privacidad.
2. Modelo de tablas y RLS con pruebas cross-tenant.
3. Consentimiento versionado y revocación probados.
4. Eliminación, exportación y job de retención certificados E2E.
5. UI distingue de forma inequívoca modo temporal e historial activo.
6. Auditoría no almacena payload financiero ni secretos.

## Pendientes de decisión

- Confirmar si 90/180 días cumplen obligaciones contractuales y regulatorias.
- Definir responsable de solicitudes de acceso/eliminación.
- Definir residencia y subprocesadores antes de integrar un proveedor LLM.
- Aprobar qué roles de E08 pueden consultar o exportar conversaciones.
