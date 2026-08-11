import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const manifest = JSON.parse(fs.readFileSync('release-manifests/current.json', 'utf8'))

test('el rollback conserva la base compartida mediante forward-fix', () => {
  assert.equal(manifest.database.strategy, 'forward-fix')
  assert.equal(manifest.database.destructiveRollbackAllowed, false)
  assert.deepEqual(manifest.database.sharedProducts, ['Denarius', 'Validus', 'Licitus', 'Animus'])
})

test('el frontend tiene un objetivo anterior distinto y verificable', () => {
  assert.match(manifest.frontend.current, /^https:\/\//)
  assert.match(manifest.frontend.rollbackTarget, /^https:\/\//)
  assert.notEqual(manifest.frontend.current, manifest.frontend.rollbackTarget)
})

test('el manifiesto cubre todas las superficies MCP desplegadas', () => {
  assert.deepEqual(manifest.edgeFunctions.sort(), ['denarius-mcp', 'denarius-mcp-metadata', 'denarius-tools'])
  for (const functionName of manifest.edgeFunctions) {
    assert.equal(fs.existsSync(`${manifest.edgeFunctionArtifact}/supabase/functions/${functionName}/index.ts`), true)
  }
})
