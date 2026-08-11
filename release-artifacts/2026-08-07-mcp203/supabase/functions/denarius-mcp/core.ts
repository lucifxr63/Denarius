import { TOOL_JSON_SCHEMAS, type ToolName } from '../denarius-tools/core.ts'

export const MCP_PROTOCOL_VERSION = '2025-11-25'
export const MCP_SERVER_INFO = { name: 'denarius', version: '0.2.0' }
export const MCP_RESOURCE = 'https://fcdhcntyvsydnvjwopfe.supabase.co/functions/v1/denarius-mcp'
export const MCP_AUTHORIZATION_SERVER = 'https://fcdhcntyvsydnvjwopfe.supabase.co/auth/v1'
export const MCP_RESOURCE_METADATA = 'https://fcdhcntyvsydnvjwopfe.supabase.co/functions/v1/denarius-mcp-metadata'

const descriptions: Record<ToolName, string> = {
  get_cash_position: 'Obtiene caja actual, restringida y disponible de la empresa autenticada.',
  get_runway_and_burn: 'Calcula burn mensual y meses de runway con la fuente financiera central.',
  list_overdue_invoices: 'Lista cuentas por cobrar vencidas de la empresa autenticada.',
  get_cash_projection: 'Proyecta caja a 30, 90 o 365 días sin persistir cambios.',
  get_restricted_cash: 'Explica y cuantifica la caja reservada para obligaciones tributarias.',
  explain_metric: 'Explica una métrica financiera permitida, su valor y fórmula.',
  get_financial_summary: 'Resume caja, capital de trabajo, burn, runway, MRR y cobranza vencida.',
  explain_projection_point: 'Explica los eventos que producen el punto más bajo de una proyección.',
  simulate_scenario: 'Simula el atraso de una cuenta por cobrar sin modificar datos reales.',
}

export const MCP_TOOLS = Object.entries(TOOL_JSON_SCHEMAS).map(([name, inputSchema]) => ({
  name,
  description: descriptions[name as ToolName],
  inputSchema,
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
}))

export const MCP_PROTECTED_RESOURCE_METADATA = {
  resource: MCP_RESOURCE,
  authorization_servers: [MCP_AUTHORIZATION_SERVER],
  bearer_methods_supported: ['header'],
  scopes_supported: ['email'],
  resource_name: 'Denarius Financial MCP',
}

export type McpRequest = { jsonrpc: '2.0'; id?: string | number; method: string; params?: Record<string, unknown> }

export function parseMcpRequest(value: unknown): McpRequest {
  if (!value || typeof value !== 'object') throw new Error('invalid_request')
  const request = value as Partial<McpRequest>
  if (request.jsonrpc !== '2.0' || typeof request.method !== 'string') throw new Error('invalid_request')
  if (request.id !== undefined && typeof request.id !== 'string' && typeof request.id !== 'number') throw new Error('invalid_request')
  if (request.params !== undefined && (!request.params || typeof request.params !== 'object' || Array.isArray(request.params))) throw new Error('invalid_request')
  return request as McpRequest
}

export function rpcResult(id: McpRequest['id'], result: unknown) {
  return { jsonrpc: '2.0' as const, id: id ?? null, result }
}

export function rpcError(id: McpRequest['id'], code: number, message: string, data?: unknown) {
  return { jsonrpc: '2.0' as const, id: id ?? null, error: { code, message, ...(data === undefined ? {} : { data }) } }
}
