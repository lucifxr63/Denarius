import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { diagnoseBusinessModel } from '../src/lib/business-model-diagnostic.ts';

describe('diagnóstico de modelo de negocio', () => {
  it('recomienda Startup SaaS para ingresos recurrentes y métricas de crecimiento', () => {
    const result = diagnoseBusinessModel({
      revenue_model: 'startup', priority: 'startup', billing: 'startup',
      operations: 'startup', growth_metrics: 'startup', funding: 'startup',
    });
    assert.equal(result.model, 'startup-saas');
    assert.equal(result.confidence, 'high');
    assert.ok(result.reasons.length > 0);
  });

  it('recomienda PyME para operación basada en facturas y flujo propio', () => {
    const result = diagnoseBusinessModel({
      revenue_model: 'pyme', priority: 'pyme', billing: 'pyme',
      operations: 'pyme', growth_metrics: 'pyme', funding: 'pyme',
    });
    assert.equal(result.model, 'pyme-tradicional');
    assert.equal(result.confidence, 'high');
  });

  it('usa PyME como punto de partida conservador en un empate', () => {
    const result = diagnoseBusinessModel({
      revenue_model: 'startup', priority: 'pyme', billing: 'neutral',
      operations: 'neutral', growth_metrics: 'neutral', funding: 'neutral',
    });
    assert.equal(result.model, 'pyme-tradicional');
    assert.equal(result.confidence, 'low');
  });
});
