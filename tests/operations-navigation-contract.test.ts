import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const operations = readFileSync(new URL('../src/pages/Dashboard.tsx', import.meta.url), 'utf8');

test('Operaciones ofrece navegación por las seis tareas reales', () => {
  const destinations = ['#financial-kpis', '#cash-projection', '#collections', '#quick-entry', '#data-import', '#history'];
  for (const destination of destinations) {
    assert.match(operations, new RegExp(`href: '${destination}'`));
    assert.match(operations, new RegExp(`id="${destination.slice(1)}"`));
  }
  assert.match(operations, /aria-label="Secciones de operaciones"/);
});

test('la navegación interna es táctil, responsive y respeta encabezados fijos', () => {
  assert.match(operations, /min-h-11/);
  assert.match(operations, /grid-cols-2/);
  assert.match(operations, /lg:grid-cols-6/);
  assert.match(operations, /scroll-mt-40/);
  assert.match(operations, /focus-visible:ring-2/);
});

test('cada bloque explica su intención antes de mostrar controles', () => {
  for (const title of ['Resumen operativo', 'Proyección y cuentas', 'Cobranza y compromisos fijos', 'Registro rápido', 'Importación masiva', 'Historial y correcciones']) {
    assert.match(operations, new RegExp(`title="${title}"`));
  }
});
