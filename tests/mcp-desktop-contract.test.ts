import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const source = readFileSync(new URL('../mcp-desktop/src/index.js', import.meta.url), 'utf8')
const manifest = JSON.parse(readFileSync(new URL('../mcp-desktop/package.json', import.meta.url), 'utf8'))

describe('paquete MCP Desktop', () => {
  it('publica un binario stdio y exige una API key individual', () => {
    assert.equal(manifest.bin['denarius-mcp'], 'src/index.js')
    assert.match(source, /StdioServerTransport/)
    assert.match(source, /DENARIUS_API_KEY/)
  })
  it('sólo reenvía listado y ejecución de herramientas', () => {
    assert.match(source, /tools\/list/)
    assert.match(source, /tools\/call/)
    assert.doesNotMatch(source, /tenant_id/)
    assert.doesNotMatch(source, /service.role|SERVICE_ROLE/i)
  })
})
