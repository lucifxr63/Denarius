import { MCP_PROTOCOL_VERSION, MCP_RESOURCE_METADATA, MCP_SERVER_INFO, MCP_TOOLS, parseMcpRequest, rpcError, rpcResult } from './core.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { hashDenariusApiKey, parseDenariusApiKey } from './api-key.ts'

const allowedOrigins = new Set(['https://denarius.scouttech.lat', 'http://localhost:5174'])
const response = (status: number, body?: unknown, origin?: string | null, extraHeaders: Record<string, string> = {}) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin) ? origin : 'https://denarius.scouttech.lat',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, mcp-protocol-version, mcp-session-id, x-denarius-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
  ...extraHeaders,
} })

Deno.serve(async (httpRequest) => {
  const origin = httpRequest.headers.get('origin')
  if (httpRequest.method === 'OPTIONS') return response(204, undefined, origin)
  if (httpRequest.method !== 'POST') return response(405, { error: 'method_not_allowed' }, origin)
  const authorization = httpRequest.headers.get('authorization')
  const apiKey = parseDenariusApiKey(httpRequest.headers.get('x-denarius-api-key'))
  if (!authorization?.startsWith('Bearer ') && !apiKey) return response(401, { error: 'missing_authorization' }, origin, {
    'WWW-Authenticate': `Bearer resource_metadata="${MCP_RESOURCE_METADATA}", scope="email"`,
  })
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return response(500, { error: 'server_misconfigured' }, origin)

  let toolAuthorization = authorization
  const principalHeaders: Record<string,string> = {}
  if (apiKey) {
    const admin = createClient(supabaseUrl,serviceRoleKey,{db:{schema:'cashflow'},auth:{persistSession:false}})
    const {data,error} = await admin.rpc('resolve_denarius_api_key',{p_secret_hash:await hashDenariusApiKey(apiKey)})
    const principal = data?.[0]
    if (error || !principal || !principal.scopes?.includes('financial:read')) return response(401,{error:'invalid_api_key'},origin)
    toolAuthorization = `Bearer ${serviceRoleKey}`
    principalHeaders['x-denarius-owner-id'] = principal.owner_id
    principalHeaders['x-denarius-tenant-id'] = principal.tenant_id
    principalHeaders['x-denarius-key-id'] = principal.key_id
  } else {
    const identity = await fetch(`${supabaseUrl}/auth/v1/user`,{headers:{Authorization:authorization!,apikey:anonKey}})
    if (!identity.ok) return response(401,{error:'invalid_token'},origin,{
      'WWW-Authenticate': `Bearer error="invalid_token", resource_metadata="${MCP_RESOURCE_METADATA}", scope="email"`,
    })
  }

  let request
  try { request = parseMcpRequest(await httpRequest.json()) }
  catch { return response(400, rpcError(undefined, -32600, 'Invalid Request')) }

  if (request.method === 'notifications/initialized') return response(202)
  if (request.method === 'ping') return response(200, rpcResult(request.id, {}))
  if (request.method === 'initialize') return response(200, rpcResult(request.id, {
    protocolVersion: MCP_PROTOCOL_VERSION,
    capabilities: { tools: { listChanged: false } },
    serverInfo: MCP_SERVER_INFO,
    instructions: 'Denarius entrega información financiera de la empresa autenticada. Las herramientas son de solo lectura y los escenarios nunca se persisten.',
  }))
  if (request.method === 'tools/list') return response(200, rpcResult(request.id, { tools: MCP_TOOLS }))
  if (request.method !== 'tools/call') return response(200, rpcError(request.id, -32601, 'Method not found'))

  const name = request.params?.name
  const args = request.params?.arguments ?? {}
  if (typeof name !== 'string') return response(200, rpcError(request.id, -32602, 'Invalid params'))

  const toolResponse = await fetch(`${supabaseUrl}/functions/v1/denarius-tools`, {
    method: 'POST',
    headers: { Authorization: toolAuthorization!, apikey: apiKey ? serviceRoleKey : anonKey, 'Content-Type': 'application/json', ...principalHeaders },
    body: JSON.stringify({ name, arguments: args }),
  })
  const payload = await toolResponse.json().catch(() => ({ error: 'invalid_tool_response' }))
  if (!toolResponse.ok) return response(200, rpcResult(request.id, {
    isError: true,
    content: [{ type: 'text', text: JSON.stringify(payload) }],
  }))
  return response(200, rpcResult(request.id, {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    structuredContent: payload,
  }))
})
