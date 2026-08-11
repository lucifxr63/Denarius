import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const page = fs.readFileSync('src/pages/WeeklyClose.tsx', 'utf8');

test('el cierre muestra preparación y resumen del snapshot', () => {
  assert.match(page, /completedChecklist/);
  assert.match(page, /role="progressbar"/);
  assert.match(page, /Preparación del cierre/);
  assert.match(page, /Revisa el snapshot y registra/);
  assert.match(page, /Fecha de corte/);
});

test('el cierre exige reconocimiento y confirmación explícita', () => {
  assert.match(page, /useConfirm/);
  assert.match(page, /type="checkbox"/);
  assert.match(page, /disabled=\{saving \|\| !acknowledged\}/);
  assert.match(page, /¿Registrar cierre con riesgos\?/);
  assert.match(page, /completeWeeklyClose\(tenant\.id, data\.as_of, note\)/);
});

test('los riesgos se conservan y ofrecen ruta de resolución', () => {
  assert.match(page, /to="\/alerts"/);
  assert.match(page, /Registrar cierre con riesgos/);
  assert.match(page, /los riesgos no se resolverán automáticamente/);
});
