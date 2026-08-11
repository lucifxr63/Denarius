# DEN-109 · Frescura y calidad de datos

La frescura se deriva del último cambio real por fuente. Estados: `FRESH` hasta 7 días, `AGING` entre 8 y 30, `STALE` sobre 30 y `EMPTY` sin registros. Las fuentes obligatorias cambian según Startup SaaS o PyME.

El cierre semanal incorpora el estado y conserva la evidencia en su snapshot. Una fuente antigua no afirma que el dato sea falso: obliga a confirmarlo antes de confiar en alertas o unit economics.
