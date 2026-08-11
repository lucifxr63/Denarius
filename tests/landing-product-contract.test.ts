import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const landing = readFileSync(new URL('../src/pages/Landing.tsx', import.meta.url), 'utf8');
const mcpDoc = readFileSync(new URL('../DENARIUS_MCP_PRODUCT.md', import.meta.url), 'utf8');
const backlog = readFileSync(new URL('../BACKLOG_DENARIUS_MCP.md', import.meta.url), 'utf8');

describe('comunicación de producto Denarius MCP', () => {
  it('presenta capacidades reales y diferencia beta de futuro', () => {
    assert.match(landing, /MCP para Claude y Desktop/);
    assert.match(landing, /Beta privada/);
    assert.match(landing, /14 herramientas|tools\.map/);
    assert.match(landing, /Futuro/);
    assert.doesNotMatch(landing, /MSP/);
  });
  it('documenta las herramientas y la puerta npm', () => {
    const tools = mcpDoc.match(/\| `(?:get_|list_|explain_|simulate_|create_|update_)[^`]+`/g) ?? [];
    assert.equal(tools.length, 14);
    assert.match(mcpDoc, /Cliente desktop y npm/);
  });
  it('prioriza MCP y mejoras propias de Denarius', () => {
    assert.match(backlog, /N1 — Publicación npm/);
    assert.match(backlog, /Mejoras propias de Denarius/);
    assert.match(backlog, /No aceptado/);
  });
});
