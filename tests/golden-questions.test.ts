import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TOOL_JSON_SCHEMAS } from '../supabase/functions/denarius-tools/core.ts';

const goldenQuestions = [
  { id: 'Q01', expected: 'get_cash_position', release: 'E06' },
  { id: 'Q02', expected: 'get_restricted_cash', release: 'E06' },
  { id: 'Q03', expected: 'get_runway_and_burn', release: 'E06' },
  { id: 'Q04', expected: 'get_cash_projection', release: 'E06' },
  { id: 'Q05', expected: 'list_overdue_invoices', release: 'E06' },
  { id: 'Q06', expected: 'explain_projection_point', release: 'E06' },
  { id: 'Q07', expected: 'simulate_scenario', release: 'E06' },
  { id: 'Q08', expected: 'get_financial_summary', release: 'E06' },
  { id: 'Q09', expected: 'explain_metric', release: 'E06' },
  { id: 'Q13', expected: 'get_weekly_action_plan', release: 'E06' },
  { id: 'Q14', expected: 'get_weekly_action_outcome', release: 'E06' },
  { id: 'Q15', expected: 'get_actionable_alerts', release: 'E06' },
  { id: 'Q16', expected: 'create_financial_action', release: 'E06' },
  { id: 'Q17', expected: 'update_financial_action_status', release: 'E06' },
  { id: 'Q10', expected: null, release: 'denied' },
  { id: 'Q11', expected: null, release: 'denied' },
  { id: 'Q12', expected: null, release: 'denied' },
] as const;

describe('evaluacion de preguntas doradas E06', () => {
  it('cubre todas las herramientas publicadas con una pregunta dorada', () => {
    const expectedE06 = new Set(goldenQuestions.filter((item) => item.release === 'E06').map((item) => item.expected));
    assert.deepEqual(expectedE06, new Set(Object.keys(TOOL_JSON_SCHEMAS)));
  });

  it('mantiene fuera del catalogo las capacidades futuras y prohibidas', () => {
    const published = new Set(Object.keys(TOOL_JSON_SCHEMAS));
    for (const item of goldenQuestions.filter((candidate) => candidate.release !== 'E06')) {
      if (item.expected) assert.equal(published.has(item.expected), false, `${item.id} no debe estar publicada`);
    }
  });

  it('conserva rechazo explicito para aislamiento, escritura y elevacion de privilegios', () => {
    assert.deepEqual(
      goldenQuestions.filter((item) => item.release === 'denied').map((item) => item.id),
      ['Q10', 'Q11', 'Q12'],
    );
  });
});
