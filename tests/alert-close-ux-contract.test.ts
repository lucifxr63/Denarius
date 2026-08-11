import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const alerts = readFileSync(new URL('../src/pages/FinancialAlerts.tsx', import.meta.url), 'utf8');
const flow = readFileSync(new URL('../src/components/layout/FinancialControlFlow.tsx', import.meta.url), 'utf8');
const shell = readFileSync(new URL('../src/components/layout/ProductPageShell.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('la cola permite filtrar prioridades sin alterar la fuente financiera', () => {
  assert.match(alerts, /type Filter = 'ALL' \| 'CRITICAL' \| 'WARNING'/);
  assert.match(alerts, /getFinancialAlertCenter/);
  assert.match(alerts, /aria-pressed=\{active\}/);
  assert.match(alerts, /filter === 'ALL' \|\| alert\.severity === filter/);
});

test('cada alerta conserva impacto, fecha, prioridad y acción profunda', () => {
  assert.match(alerts, /Prioridad \{index \+ 1\}/);
  assert.match(alerts, /alert\.amount/);
  assert.match(alerts, /alert\.due_date/);
  assert.match(alerts, /to=\{alert\.deep_link\}/);
  assert.match(alerts, /alert\.action_label/);
});

test('Alertas y Cierre comparten un flujo semanal de tres pasos', () => {
  for (const route of ['/data-quality', '/alerts', '/weekly-close']) assert.match(flow, new RegExp(`to: '${route}'`));
  assert.match(flow, /aria-current=\{index === currentIndex \? 'step'/);
  assert.match(shell, /context\?: ReactNode/);
  assert.match(app, /FinancialControlFlow current="alerts"/);
  assert.match(app, /FinancialControlFlow current="close"/);
});
