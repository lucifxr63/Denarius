import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { hashDenariusApiKey, parseDenariusApiKey } from '../supabase/functions/denarius-mcp/api-key.ts'

describe('credenciales MCP de Denarius', () => {
  const secret = `dnr_live_${'a'.repeat(48)}`
  it('acepta únicamente claves Denarius completas', () => {
    assert.equal(parseDenariusApiKey(secret), secret)
    assert.equal(parseDenariusApiKey(null), null)
    assert.equal(parseDenariusApiKey('dnr_live_short'), null)
    assert.equal(parseDenariusApiKey(`animus_${'a'.repeat(48)}`), null)
    assert.equal(parseDenariusApiKey(`dnr_live_${'A'.repeat(48)}`), null)
  })
  it('genera un hash estable sin conservar el secreto', async () => {
    const hash = await hashDenariusApiKey(secret)
    assert.match(hash, /^[0-9a-f]{64}$/)
    assert.equal(hash, await hashDenariusApiKey(secret))
    assert.notEqual(hash, secret)
  })
})
