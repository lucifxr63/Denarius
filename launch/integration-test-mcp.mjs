import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#') && line.includes('=')).map(line => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()]))
const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }, db: { schema: 'cashflow' } })
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false }, db: { schema: 'cashflow' } })
const tag = Date.now()
const credentials = { email: `cf-test-mcp-${tag}@scouttech.lat`, password: crypto.randomUUID() + 'Aa1!' }
let userId
let failures = 0
const check = (condition, message) => { console.log(`${condition ? '✅' : '❌'} ${message}`); if (!condition) failures++ }

try {
  const created = await admin.auth.admin.createUser({ ...credentials, email_confirm: true })
  userId = created.data.user?.id
  check(Boolean(userId), 'usuario temporal creado')
  const session = await client.auth.signInWithPassword(credentials)
  const token = session.data.session?.access_token
  check(Boolean(token), 'sesión MCP autenticada')
  const tenant = await client.from('tenant').select('id').limit(1).single()
  const consent = await client.rpc('set_denarius_mcp_oauth_grant', { p_tenant_id: tenant.data?.id, p_scopes: ['financial:read', 'alerts:read', 'actions:write'] })
  check(!consent.error, 'consentimiento OAuth concede scopes explícitos')
  const endpoint = `${env.VITE_SUPABASE_URL}/functions/v1/denarius-mcp`
  const unauthenticated = await fetch(endpoint, { method: 'POST', headers: { apikey: env.VITE_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 0, method: 'initialize' }) })
  check(unauthenticated.status === 401 && unauthenticated.headers.get('www-authenticate')?.includes('resource_metadata='), '401 anuncia metadata OAuth RFC 9728')
  const metadataResponse = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/denarius-mcp-metadata`)
  const metadata = await metadataResponse.json()
  check(metadataResponse.ok && metadata.resource === endpoint && metadata.authorization_servers?.[0]?.endsWith('/auth/v1'), 'metadata identifica recurso y servidor de autorización')
  const call = async body => {
    const result = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${token}`, apikey: env.VITE_SUPABASE_ANON_KEY, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: JSON.stringify(body) })
    return { status: result.status, body: result.status === 202 ? null : await result.json() }
  }
  const initialized = await call({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'denarius-certifier', version: '1.0.0' } } })
  check(initialized.status === 200 && initialized.body?.result?.serverInfo?.name === 'denarius' && initialized.body?.result?.protocolVersion === '2025-11-25', 'negocia MCP 2025-11-25 como servidor Denarius')
  const notification = await call({ jsonrpc: '2.0', method: 'notifications/initialized' })
  check(notification.status === 202, 'acepta notificación initialized')
  const tools = await call({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
  if (tools.body?.result?.tools?.length !== 14) console.error('Catálogo MCP recibido:', tools.body?.result?.tools?.map(tool => tool.name))
  check(tools.body?.result?.tools?.length === 14, 'publica catorce herramientas MCP según scopes consentidos')
  check(tools.body?.result?.tools?.every(tool => !tool.inputSchema.properties.tenant_id), 'ninguna herramienta permite elegir tenant')
  const summary = await call({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'get_financial_summary', arguments: {} } })
  if (summary.body?.result?.isError === true || !summary.body?.result) console.error('Respuesta MCP financiera:', JSON.stringify(summary.body))
  check(summary.status === 200 && summary.body?.result?.isError !== true, 'ejecuta una herramienta financiera mediante MCP')
  check(summary.body?.result?.structuredContent?.tenant_id, 'respuesta conserva tenant y fuentes resueltos por servidor')
} catch (error) {
  console.error('❌ Excepción', error)
  failures++
} finally {
  if (userId) check(!(await admin.auth.admin.deleteUser(userId)).error, 'usuario temporal eliminado con cascade')
}
if (failures) process.exit(1)
console.log('✅ Denarius MCP certificado con cero huella')
