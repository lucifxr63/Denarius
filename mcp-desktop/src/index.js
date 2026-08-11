#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'

const endpoint = process.env.DENARIUS_MCP_URL
  ?? 'https://fcdhcntyvsydnvjwopfe.supabase.co/functions/v1/denarius-mcp'
const apiKey = process.env.DENARIUS_API_KEY

if (!apiKey) {
  process.stderr.write('DENARIUS_API_KEY es obligatoria. Genérala en Denarius y reinicia el cliente MCP.\n')
  process.exit(1)
}

let requestId = 0
async function remote(method, params = {}) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-denarius-api-key': apiKey,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++requestId, method, params }),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.error ?? `Denarius respondió HTTP ${response.status}`)
  if (payload?.error) throw new Error(payload.error.message ?? 'Error MCP remoto')
  return payload?.result
}

const server = new Server(
  { name: 'denarius-desktop', version: '0.1.0' },
  { capabilities: { tools: {} } },
)

server.setRequestHandler(ListToolsRequestSchema, async () => await remote('tools/list'))
server.setRequestHandler(CallToolRequestSchema, async request => await remote('tools/call', request.params))

await server.connect(new StdioServerTransport())
