# OPS-105 · Soporte beta

Canal interno con casos estructurados, identificador `DNR-*`, historial y SLA: urgente 1 hora, alto 4 horas y normal 1 día hábil. Los resúmenes rechazan correos y patrones de API key; nunca se adjuntan métricas, respuestas MCP ni documentos.

El corte de emergencia revoca en una transacción todas las API keys activas de la empresa y crea un caso `SECURITY/URGENT`. No modifica OAuth global ni sesiones de Validus, Licitus o Animus.
