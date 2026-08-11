import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatToolResult } from '../src/lib/copilot-presenter.ts';

const base = {
  version: '2026-08-06', tenant_id: 'tenant', as_of: '2026-08-06', currency: 'CLP', confidence: 'high', sources: [], navigation: { path: '/dashboard', label: 'Abrir dashboard' }, evidence: [],
} as const;

describe('presentador del copiloto', () => {
  it('resume caja con cifras de la herramienta', () => {
    const text = formatToolResult({ ...base, tool: 'get_cash_position', data: {
      current_cash: 1_000_000, restricted_cash: 200_000, available_cash: 800_000,
    } });
    assert.match(text, /800[\s.]?000/);
    assert.match(text, /restringida/i);
  });

  it('identifica escenarios como no guardados', () => {
    const text = formatToolResult({ ...base, tool: 'simulate_scenario', data: {
      persisted: false, result: { lowest_balance: 100_000, ending_balance: 200_000 },
    } });
    assert.match(text, /no guardada/i);
  });

  it('presenta el runway con un decimal localizado', () => {
    const text = formatToolResult({ ...base, tool: 'get_runway_and_burn', data: {
      monthly_burn: 95_111, runway_months: 0.6063126241969908,
    } });
    assert.match(text, /0,6 meses/);
    assert.doesNotMatch(text, /0\.606312/);
  });
});
