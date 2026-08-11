# MCP-203–205 — Navegación, historial y evidencia

Cada resultado de las nueve herramientas incluye un `navigation.path`, una etiqueta visible y hasta cuatro evidencias numéricas con fecha de corte. Estos metadatos viajan tanto al copiloto web como a clientes MCP.

El copiloto guarda únicamente consultas que ejecutaron una herramienta financiera: pregunta, resumen presentado, nombre de herramienta, corte, enlace y hasta seis evidencias. No guarda argumentos internos, payload completo, tokens, claves ni hashes.

El historial está aislado por `tenant_id` y `auth.uid()`, limitado a 50 entradas por carga, filtrable por herramienta y eliminable individualmente o en conjunto. Los enlaces siempre son rutas internas permitidas de Denarius.
