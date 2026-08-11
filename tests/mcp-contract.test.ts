import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { MCP_PROTOCOL_VERSION, MCP_PROTECTED_RESOURCE_METADATA, MCP_RESOURCE, MCP_SERVER_INFO, MCP_TOOLS, parseMcpRequest, rpcError, rpcResult } from '../supabase/functions/denarius-mcp/core.ts'

describe('servidor MCP de Denarius', () => {
  it('publica identidad, versión de protocolo y catorce herramientas financieras', () => {
    assert.equal(MCP_PROTOCOL_VERSION, '2025-11-25')
    assert.equal(MCP_SERVER_INFO.name, 'denarius')
    assert.equal(MCP_TOOLS.length, 14)
    assert.ok(MCP_TOOLS.some(tool=>tool.name==='get_weekly_action_plan'))
    assert.ok(MCP_TOOLS.some(tool=>tool.name==='get_weekly_action_outcome'))
    assert.ok(MCP_TOOLS.every(tool => tool.inputSchema.additionalProperties === false))
    assert.ok(MCP_TOOLS.every(tool => !tool.annotations.destructiveHint))
    assert.equal(MCP_TOOLS.filter(tool => !tool.annotations.readOnlyHint).length, 2)
  })

  it('publica metadata RFC 9728 para descubrimiento OAuth', () => {
    assert.equal(MCP_PROTECTED_RESOURCE_METADATA.resource, MCP_RESOURCE)
    assert.deepEqual(MCP_PROTECTED_RESOURCE_METADATA.authorization_servers, ['https://fcdhcntyvsydnvjwopfe.supabase.co/auth/v1'])
    assert.deepEqual(MCP_PROTECTED_RESOURCE_METADATA.bearer_methods_supported, ['header'])
  })

  it('acepta JSON-RPC válido y rechaza identidad o params inválidos', () => {
    assert.deepEqual(parseMcpRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list' }).method, 'tools/list')
    assert.throws(() => parseMcpRequest({ jsonrpc: '1.0', method: 'tools/list' }))
    assert.throws(() => parseMcpRequest({ jsonrpc: '2.0', method: 'tools/call', params: [] }))
  })

  it('construye respuestas JSON-RPC sin exponer tenant controlable por el cliente', () => {
    assert.deepEqual(rpcResult(2, { ok: true }), { jsonrpc: '2.0', id: 2, result: { ok: true } })
    assert.equal(rpcError(2, -32601, 'Method not found').error.code, -32601)
    assert.ok(MCP_TOOLS.every(tool => !('tenant_id' in tool.inputSchema.properties)))
  })
})
