# Barreras de cambio de plataforma

Estas reglas protegen la base compartida por Denarius, Validus, Licitus y Animus.

## Antes de integrar

1. Ejecutar `npm run validate:platform`.
2. Ejecutar `npm run check`.
3. Aplicar la migración específica mediante su script aprobado.
4. Ejecutar la certificación remota correspondiente con datos temporales y limpieza verificable.

GitHub Actions ejecuta automáticamente los dos primeros controles en cada pull request y en cada cambio a `main`.

## Controles automáticos

- Versiones y nombres únicos de migraciones.
- Bloqueo de `DROP TABLE`, `TRUNCATE`, borrado directo de usuarios y renombrado de tablas.
- `SECURITY DEFINER` con `search_path` explícito.
- Ninguna credencial `service_role` en clientes.
- Ninguna terminología MSP visible en el producto.
- CORS sin wildcard en funciones privadas; la metadata pública es la única excepción explícita.

## Compatibilidad compartida

Los objetos históricos `msp_task*` permanecen únicamente como almacenamiento interno para evitar una migración destructiva. Denarius consume desde ahora la API neutral:

- `create_financial_task`
- `update_financial_task_status`
- `comment_financial_task`
- `financial_task_workspace`

No se cambiarán OAuth global, tablas de identidad ni contratos usados por otros productos sin diseño conjunto, rollback ensayado y certificación cruzada.
