import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const header = readFileSync(new URL('../src/components/layout/ProductHeader.tsx', import.meta.url), 'utf8');
const workspace = readFileSync(new URL('../src/pages/Workspace.tsx', import.meta.url), 'utf8');
const operations = readFileSync(new URL('../src/pages/Dashboard.tsx', import.meta.url), 'utf8');
const shell = readFileSync(new URL('../src/components/layout/ProductPageShell.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('la navegación prioriza las cuatro tareas financieras principales', () => {
  for (const route of ['/dashboard', '/operations', '/alerts', '/weekly-close']) {
    assert.match(header, new RegExp(`to: '${route}'`));
  }
  assert.match(header, /Navegación principal/);
  assert.match(header, /NavLink/);
});

test('las herramientas secundarias están agrupadas y conservan el contexto del modelo', () => {
  assert.match(header, /<details/);
  assert.match(header, /Más\s*<ChevronDown/);
  assert.match(header, /model === 'startup-saas'/);
  for (const route of ['/connections', '/subscriptions', '/data-quality', '/support']) {
    assert.match(header, new RegExp(`to="${route}"`));
  }
});

test('la cabecera es táctil, accesible y compartida por las vistas críticas', () => {
  assert.match(header, /min-h-11/);
  assert.match(header, /focus-visible:ring-2/);
  assert.match(header, /aria-label="Navegación móvil"/);
  assert.match(workspace, /<ProductHeader \/>/);
  assert.match(operations, /<ProductHeader/);
});

test('las páginas secundarias usan el mismo shell sin duplicar su cabecera visible', () => {
  assert.match(shell, /<ProductHeader \/>/);
  assert.match(shell, /header:first-child/);
  for (const page of ['SaasSubscriptions', 'DataQuality', 'BetaSupport', 'WeeklyClose', 'FinancialAlerts', 'McpConnections']) {
    assert.match(app, new RegExp(`<ProductPageShell[^\\n]*<${page} \\/>[^\\n]*<\\/ProductPageShell>`));
  }
});
