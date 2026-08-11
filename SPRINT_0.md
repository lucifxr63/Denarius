# Documento histórico — Sprint 0

> Las referencias a MSP pertenecen a una interpretación anterior. La dirección
> vigente es MCP (Model Context Protocol); consultar `BACKLOG_DENARIUS_MCP.md`.

# Sprint 0 — Fundaciones del MVP y primer MSP

> Estado: iniciado
> Épicas: E00, E01 y auditoría inicial de E02
> Propósito: establecer alcance, calidad técnica y verdad financiera antes de
> construir el copiloto.

## 1. Resultado comprometido

Al finalizar el Sprint 0, Denarius debe tener:

- una definición explícita de quién usa y compra el primer producto;
- una pipeline que impida integrar código que rompa reglas financieras centrales;
- inventario verificable de infraestructura y servicios desplegados;
- diagnóstico de migraciones, tipos y RPC;
- dataset de demostración reproducible;
- backlog priorizado para R0 — Base estable;
- matriz inicial de permisos del futuro agente.

## 2. Alcance aceptado

### Producto

- Segmento provisional: PyME chilena de servicios, con 1–20 personas y flujo
  bancario de baja o media complejidad.
- Denarius soportará startups SaaS como lente secundaria, no como segundo
  go-to-market simultáneo durante R0/R1.
- La propuesta inicial es visibilidad, proyección y anticipación de caja; no
  contabilidad completa ni ejecución de pagos.

### Técnico

- Verificación local de build, proyección y contratos de datos.
- Auditoría de Supabase y Edge Functions solamente con acceso explícito y en modo
  lectura durante este sprint.
- Cambios locales reversibles: pruebas, CI, documentación y correcciones necesarias
  para estabilizar.
- MSP inicial de solo lectura, diseñado ahora y construido después de E06.

## 3. Fuera de alcance y no aceptado

- No se aceptan pagos, transferencias ni presentación de impuestos desde el chat.
- No se acepta que el agente consulte tablas directamente o use service-role desde
  un cliente.
- No se aceptan métricas mock presentadas como información real.
- No se acepta mezclar tenants, incluso en entornos demo o de soporte.
- No se acepta ejecutar `supabase db push` ni migraciones remotas sin auditoría,
  backup, revisión y plan de rollback.
- No se acepta guardar secretos, PDFs financieros o datos de clientes en Git.
- No se acepta ampliar el MVP a ERP, contabilidad completa, Open Banking y SII en
  este sprint.
- No se acepta considerar una historia terminada solo porque la UI funciona.

## 4. Requisitos funcionales

### RF-00 — Alcance comercial

Debe existir una ficha del segmento inicial con problema, usuario, comprador,
alternativa actual, cinco decisiones financieras y métricas de éxito.

### RF-01 — Reglas financieras protegidas

El motor debe verificar automáticamente:

- A/P vencida se refleja hoy;
- A/R vencida no infla la proyección;
- facturas pagadas/canceladas no proyectan;
- recurrencias se expanden sin persistir eventos futuros;
- impuesto se reserva solo sobre ingresos aplicables;
- burn y runway excluyen datos fuera del período;
- agregación conserva saldo de cierre.

### RF-02 — Auditoría de infraestructura

Debe registrarse por ambiente:

- proyecto y esquema Supabase;
- migraciones efectivamente desplegadas;
- Edge Functions y versiones;
- dominios, OAuth redirects y CORS;
- buckets y políticas de retención;
- observabilidad y responsables.

### RF-03 — Contrato de base de datos

Los tipos TypeScript deben coincidir con el esquema confirmado. Las RPC de métricas
deben tener contrato, permisos, pruebas cross-tenant y respuesta versionable.

### RF-04 — Permisos del agente

Cada capacidad futura debe clasificarse como:

- lectura automática;
- propuesta sin ejecución;
- escritura con confirmación;
- operación prohibida.

## 5. Requisitos no funcionales

- Seguridad: aislamiento cross-tenant y mínimo privilegio.
- Fiabilidad: idempotencia en futuras escrituras y errores explícitos.
- Rendimiento: presupuesto y medición para RPC críticas.
- Observabilidad: errores con release/entorno, sin datos financieros sensibles.
- Portabilidad: la lógica no puede depender exclusivamente del canal web.
- Auditabilidad: fecha de corte, fuente y actor en cada resultado financiero.
- Accesibilidad: estados de carga, vacío y error utilizables con teclado/lector.

## 6. Criterios de aceptación del Sprint 0

### AC-01 — Pipeline local

**Dado** un checkout limpio con una versión soportada de Node,
**cuando** se ejecuta `npm ci && npm run check`,
**entonces** las pruebas y el build terminan correctamente sin secretos.

### AC-02 — Regresión financiera

**Dado** un cambio en `projection.ts`,
**cuando** altera vencimientos, impuestos, recurrencias, burn o agregación,
**entonces** al menos una prueba automática falla antes de integrar el cambio.

### AC-03 — CI

**Dado** un push a `main` o una pull request,
**cuando** GitHub Actions ejecuta CI,
**entonces** bloquea el merge si falla test o build.

### AC-04 — Verdad remota

**Dado** acceso de lectura al proyecto Supabase,
**cuando** se completa la auditoría,
**entonces** cada tabla, RPC, función y migración queda marcada como confirmada,
ausente o divergente; no se acepta “debería existir”.

### AC-05 — Tipos sincronizados

**Dado** el esquema remoto confirmado,
**cuando** se regeneran los tipos,
**entonces** `business_model`, `ppm_rate`, `metrics_pyme` y `metrics_saas` aparecen
sin aserciones manuales y el build continúa verde.

### AC-06 — Sin mocks invisibles

**Dado** un ambiente productivo,
**cuando** falta una RPC financiera,
**entonces** la UI muestra indisponibilidad explícita y nunca presenta un mock como
si proviniera de la empresa.

### AC-07 — Decisión de segmento

**Dado** el cierre del sprint,
**cuando** se prioriza R1,
**entonces** existe un segmento primario aprobado y las historias fuera de él se
posponen o justifican.

## 7. Historias iniciales

| ID | Historia | Prioridad | Estado |
|---|---|---:|---|
| S0-01 | Proteger el motor de proyección con pruebas | P0 | Completado (base) |
| S0-02 | Ejecutar test + build en CI | P0 | Completado (local/definición CI) |
| S0-03 | Crear ficha y entrevistas del segmento inicial | P0 | Pendiente |
| S0-04 | Inventariar infraestructura remota | P0 | Completado; Auth/Storage pendiente |
| S0-05 | Comparar esquema remoto con tipos locales | P0 | Completado |
| S0-06 | Certificar RPC PyME/SaaS y RLS | P0 | Completado |
| S0-07 | Crear dataset demo reproducible | P1 | Completado |
| S0-08 | Definir matriz de permisos del agente | P1 | Completado |
| S0-09 | Presupuestar y dividir bundle por rutas | P1 | Base completada; vendor pendiente |
| S0-10 | Consolidar documentación vigente | P1 | En progreso |

## 8. Plan de ejecución

### Bloque A — calidad local

1. Añadir pruebas del motor financiero.
2. Añadir `npm run check`.
3. Añadir CI.
4. Medir cobertura de reglas y completar casos borde.

### Bloque B — definición de producto

1. Preparar ficha de segmento e hipótesis.
2. Entrevistar al menos cinco empresas.
3. Registrar flujo actual, frecuencia, dolor y disposición de pago.
4. Aprobar o cambiar el segmento provisional.

### Bloque C — verdad remota

1. Obtener acceso de solo lectura.
2. Capturar inventario y versiones sin secretos.
3. Comparar remoto, migraciones locales y tipos.
4. Proponer plan de convergencia y rollback.
5. Ejecutar cambios remotos únicamente en un sprint posterior aprobado.

### Bloque D — diseño MSP

1. Definir matriz de permisos.
2. Definir preguntas doradas del copiloto.
3. Diseñar respuestas con fecha de corte, fuentes y confianza.
4. Delimitar herramientas de E06, sin implementarlas aún.

## 9. Evidencia de inicio

- Se incorporó una suite inicial del motor de proyección.
- Se incorporaron los comandos `npm test` y `npm run check`.
- Se incorporó una workflow de CI para pull requests y `main`.
- Se dividió el frontend por rutas: landing, login y dashboards se cargan bajo
  demanda. El chunk inicial bajó de ~1.132 KB a ~511 KB minificados; queda pendiente
  separar dependencias compartidas para eliminar completamente la advertencia.
- La auditoría administrativa y SQL continúa pendiente hasta renovar el token de
  administración; la superficie OpenAPI y Edge Functions ya fue auditada.

## 10. Resultado del segundo bloque

- El OpenAPI remoto confirma diez tablas, cuatro RPC y las columnas
  `business_model`/`ppm_rate`.
- Cinco Edge Functions exponen preflight correcto para `denarius.scouttech.lat`;
  `cashflow-weekly-cron` permanece fuera de la superficie CORS del navegador.
- Los tipos TypeScript se sincronizaron y se retiró la aserción manual de RPC.
- Se añadió `npm run audit:remote` como auditoría repetible y no destructiva.
- Se añadió un dataset demo determinista y sin datos personales.
- La suite creció a 12 pruebas y continúa verde junto con el build.
- Se definieron permisos y preguntas doradas del agente read-only.

El historial divergente quedó reconciliado mediante precondiciones, el hardening de
grants fue aplicado y el parser PDF terminó en verde con timeout y cleanup. La CLI
continúa sin enlace formal, pero ya no bloquea la trazabilidad de estas versiones.
Resta auditar configuración administrativa de Auth/Storage y cerrar la validación
comercial del segmento.

## 11. Inicio de E06

- Edge Function `denarius-tools` desplegada con JWT obligatorio.
- Siete herramientas read-only operativas y certificadas E2E.
- Tenant resuelto desde sesión/RLS; no aceptado como argumento.
- Contrato con versión, `as_of`, moneda, confianza y fuentes.
- Proyección server-side alineada con vencimientos, recurrencias e impuestos.
- Auditoria RLS sin payload financiero y rate limiting de 30 solicitudes/minuto.
- Suite local ampliada a 25 pruebas, incluidas preguntas doradas.
