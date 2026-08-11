import { MCP_PROTECTED_RESOURCE_METADATA } from '../denarius-mcp/core.ts'

Deno.serve((request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' } })
  if (request.method !== 'GET') return Response.json({ error: 'method_not_allowed' }, { status: 405 })
  return Response.json(MCP_PROTECTED_RESOURCE_METADATA, { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300' } })
})
