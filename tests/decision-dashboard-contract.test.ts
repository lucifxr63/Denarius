import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const canvas = readFileSync(new URL('../src/components/dashboard/DashboardCanvas.tsx', import.meta.url), 'utf8');
const operations = readFileSync(new URL('../src/pages/Dashboard.tsx', import.meta.url), 'utf8');

test('Startup prioriza seis señales sin eliminar los indicadores avanzados', () => {
  for (const widget of ['burnRateWidget', 'runwayWidget', 'mrrWidget', 'mrrGrowthWidget', 'atRiskMrrWidget', 'overdueRenewalsWidget']) {
    assert.match(canvas, new RegExp(`'${widget}'`));
  }
  assert.match(canvas, /Análisis avanzado/);
  assert.match(canvas, /advancedWidgets\.length/);
  assert.match(canvas, /aria-expanded=\{showAdvanced\}/);
});

test('el centro de decisiones enlaza acciones financieras reales', () => {
  assert.match(canvas, /to="\/operations#quick-entry"/);
  assert.match(canvas, /to="\/alerts"/);
  assert.match(canvas, /to="\/weekly-close"/);
  assert.match(canvas, /to="\/data-quality"/);
  assert.match(operations, /id="quick-entry"/);
});

test('las señales de atención se derivan de tonos explícitos', () => {
  assert.match(canvas, /metric\.tone === 'negative'/);
  assert.match(canvas, /metric\.tone === 'warning'/);
  assert.match(canvas, /señal\(es\) requieren revisión/);
});
