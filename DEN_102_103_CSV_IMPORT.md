# DEN-102 / DEN-103 — Conciliación e importación CSV

## Flujo

1. El usuario selecciona una cuenta y un archivo CSV de hasta 2 MB y 500 filas.
2. Denarius detecta coma o punto y coma y propone el mapeo de fecha, monto, descripción, tipo y referencia.
3. La vista previa valida fechas y montos y consulta al servidor las huellas ya existentes o repetidas dentro del archivo.
4. Al confirmar, el servidor vuelve a calcular cada huella e inserta únicamente movimientos nuevos.
5. La cuenta y el dashboard se actualizan desde la verdad persistida.

## Huella de conciliación

La huella combina cuenta/propietario con fecha, tipo, monto absoluto, descripción normalizada y referencia. El índice único impide carreras o reintentos duplicados. Los movimientos históricos se conservan; si ya existían filas iguales, una queda como coincidencia canónica y las demás reciben una marca histórica única.

## No aceptado

- Confiar sólo en la detección del navegador.
- Permitir que el cliente envíe `owner_id` o `tenant_id` al RPC.
- Importar fechas o montos inválidos.
- Más de 500 filas por lote.
- Eliminar movimientos históricos durante la conciliación.
