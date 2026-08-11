import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const page = readFileSync(new URL('../src/pages/McpConnections.tsx', import.meta.url), 'utf8');
const queries = readFileSync(new URL('../src/lib/queries.ts', import.meta.url), 'utf8');

describe('interfaz Conectar asistente', () => {
  it('cubre creación, copia única, listado y revocación', () => {
    for (const text of ['Nueva API key', 'no volveremos a mostrarla', 'Dispositivos conectados', 'Revocar']) {
      assert.match(page, new RegExp(text));
    }
    assert.match(queries, /create_denarius_api_key/);
    assert.match(queries, /list_denarius_api_keys/);
    assert.match(queries, /revoke_denarius_api_key/);
  });

  it('no permite que el usuario introduzca un tenant', () => {
    assert.doesNotMatch(page, /tenant[_-]id/i);
    assert.match(page, /financial:read|Sólo lectura financiera/);
  });
});
