import { supabase } from '@/lib/supabase';
import type { Database, Json } from '@/lib/database.types';
import type { BusinessModel, DiagnosticAnswers } from '@/lib/business-model-diagnostic';
import type { ImportRow } from '@/lib/csv-import';
import type { EvidenceItem, FinancialToolName } from '@/lib/financial-tools';

// Capa de data-access tipada sobre el modelo PRD de cashflow.*.
// RLS filtra por owner_id = auth.uid(); en INSERT inyectamos owner_id (lo exige
// el WITH CHECK). Las facturas se crean vía la Edge Function (contrato estricto).

type Tables = Database['cashflow']['Tables'];

export type Tenant = Tables['tenant']['Row'];
export type BankAccount = Tables['bank_account']['Row'];
export type Transaction = Tables['transaction']['Row'];
export type Invoice = Tables['invoice']['Row'];
export type RecurringTransaction = Tables['recurring_transaction']['Row'];

export type FinancialAlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export interface FinancialAlert { id:string;kind:string;severity:FinancialAlertSeverity;title:string;message:string;amount?:number;due_date?:string;action_label:string;deep_link:string;evidence:Record<string,unknown> }
export interface FinancialAlertCenter { as_of:string;business_model:BusinessModel;summary:{critical:number;warning:number;info:number;total:number};alerts:FinancialAlert[] }
export async function getFinancialAlertCenter(tenantId:string,asOf?:string):Promise<FinancialAlertCenter>{const {data,error}=await(supabase as any).rpc('denarius_run_as_tenant_owner',{p_tenant_id:tenantId,p_permission:'financial.read',p_operation:'alerts.read',p_payload:asOf?{as_of:asOf}:{}});if(error)throw error;return data as FinancialAlertCenter}
export interface UnitEconomics {period:string;business_model:BusinessModel;assessment:'INCOMPLETE'|'HEALTHY'|'WATCH'|'UNVIABLE';reasons:string[];missing_inputs:string[];metrics:{revenue_or_mrr:number;active_customers:number;customers_acquired:number|null;units_sold:number|null;acquisition_spend:number;delivery_costs:number;arpa:number|null;gross_or_contribution_margin:number|null;cac:number|null;ltv:number|null;ltv_cac_ratio:number|null;cac_payback_months:number|null}}
export interface WeeklyCloseSnapshot {core:Record<string,number|null>;alerts:FinancialAlertCenter;unit_economics:UnitEconomics;checklist:Array<{id:string;label:string;done:boolean}>}
export interface WeeklyActionOutcome{plan_week_start:string|null;has_close_comparison:boolean;total_actions:number;completed_actions:number;overdue_actions:number;declared_impact_count:number;expected_cash_impact:number|null;completed_expected_cash_impact:number|null;actual_cash_change:number|null}export interface WeeklyCloseWorkspace {week_start:string;as_of:string;core:Record<string,number|null>;alerts:FinancialAlertCenter;unit_economics:UnitEconomics;inputs?:{acquisition_spend:number;delivery_costs:number;units_sold:number|null;customers_acquired:number|null}|null;action_outcome?:WeeklyActionOutcome;checklist:Array<{id:string;label:string;done:boolean}>;history:Array<{id:string;week_start:string;as_of:string;status:'CLOSED'|'CLOSED_WITH_RISKS';snapshot:WeeklyCloseSnapshot;note:string|null;closed_at:string}>}
export async function getWeeklyCloseWorkspace(tenantId:string):Promise<WeeklyCloseWorkspace>{const{data,error}=await(supabase as any).rpc('denarius_run_as_tenant_owner',{p_tenant_id:tenantId,p_permission:'financial.read',p_operation:'close.read',p_payload:{}});if(error)throw error;const workspace=data as WeeklyCloseWorkspace;workspace.inputs=await getUnitEconomicsInput(tenantId,workspace.as_of.slice(0,7));const outcome=await(supabase as any).rpc('denarius_run_as_tenant_owner',{p_tenant_id:tenantId,p_permission:'financial.read',p_operation:'action.outcome',p_payload:{}});if(outcome.error)throw outcome.error;workspace.action_outcome=outcome.data as WeeklyActionOutcome;return workspace}
export async function saveUnitEconomicsInput(input:{tenantId:string;period:string;acquisitionSpend:number;deliveryCosts:number;unitsSold:number|null;customersAcquired:number|null}){const{error}=await(supabase as any).rpc('denarius_run_as_tenant_owner',{p_tenant_id:input.tenantId,p_permission:'financial.write',p_operation:'close.inputs',p_payload:{period:input.period,acquisition_spend:input.acquisitionSpend,delivery_costs:input.deliveryCosts,units_sold:input.unitsSold,customers_acquired:input.customersAcquired}});if(error)throw error}
export async function completeWeeklyClose(tenantId:string,asOf:string,note:string){const{data,error}=await(supabase as any).rpc('denarius_run_as_tenant_owner',{p_tenant_id:tenantId,p_permission:'close.manage',p_operation:'close.complete',p_payload:{as_of:asOf,note:note||null}});if(error)throw error;return data}
export interface FinancialActionPlan{open_count:number;done_count:number;overdue_count:number;actions:Array<{id:string;title:string;priority:'LOW'|'MEDIUM'|'HIGH'|'URGENT';status:'OPEN'|'IN_PROGRESS'|'BLOCKED'|'DONE';assignee:string|null;due_date:string|null;expected_cash_impact:number|null;deep_link:string|null;weekly_close_id:string}>}export async function getFinancialActionPlan(tenantId:string):Promise<FinancialActionPlan>{const{data,error}=await(supabase as any).rpc('denarius_run_as_tenant_owner',{p_tenant_id:tenantId,p_permission:'financial.read',p_operation:'action.read',p_payload:{}});if(error)throw error;return data as FinancialActionPlan}export async function updateFinancialActionStatus(taskId:string,status:FinancialActionPlan['actions'][number]['status']){const{error}=await(supabase as any).rpc('denarius_update_action_status',{p_task_id:taskId,p_status:status,p_comment:`Estado actualizado desde plan semanal: ${status}`});if(error)throw error}
export async function updateFinancialActionDetails(input:{taskId:string;assignee:string;dueDate:string;expectedCashImpact:number|null}){const{error}=await(supabase as any).rpc('denarius_update_action_details',{p_task_id:input.taskId,p_assignee:input.assignee,p_due_date:input.dueDate,p_expected_cash_impact:input.expectedCashImpact});if(error)throw error}
export interface BetaSupportWorkspace{service_status:'OPERATIONAL';release_id:string;active_mcp_keys:number;sla:Record<string,string>;cases:Array<{id:string;diagnostic_id:string;category:string;surface:string;priority:string;status:string;summary:string|null;response_due_at:string;created_at:string}>}
export async function getBetaSupportWorkspace(tenantId:string):Promise<BetaSupportWorkspace>{const{data,error}=await supabase.rpc('beta_support_workspace',{p_tenant_id:tenantId});if(error)throw error;return data as unknown as BetaSupportWorkspace}
export async function createBetaSupportCase(input:{tenantId:string;category:string;surface:string;priority:string;summary:string}){const{data,error}=await supabase.rpc('create_beta_support_case',{p_tenant_id:input.tenantId,p_category:input.category,p_surface:input.surface,p_priority:input.priority,p_summary:input.summary||null});if(error)throw error;return data}
export async function emergencyRevokeDenariusKeys(tenantId:string):Promise<{revoked:number}>{const{data,error}=await supabase.rpc('emergency_revoke_denarius_keys',{p_tenant_id:tenantId});if(error)throw error;return data as unknown as{revoked:number}}
export type FreshnessStatus='FRESH'|'AGING'|'STALE'|'EMPTY';export interface DataFreshnessWorkspace{as_of:string;business_model:BusinessModel;overall_status:'FRESH'|'AGING'|'STALE'|'INCOMPLETE';required_ready:number;required_total:number;sources:Array<{source:string;label:string;last_updated:string|null;row_count:number;required:boolean;deep_link:string;age_days:number|null;status:FreshnessStatus;message:string}>}export async function getDataFreshnessWorkspace(tenantId:string):Promise<DataFreshnessWorkspace>{const{data,error}=await supabase.rpc('data_freshness_workspace',{p_tenant_id:tenantId});if(error)throw error;return data as unknown as DataFreshnessWorkspace}

export type TxType = 'IN' | 'OUT';
export type InvoiceType = 'AR' | 'AP';
export type InvoiceStatus = 'PENDING' | 'PAID' | 'CANCELLED';
export type SourceSystem = 'MANUAL' | 'PDF_AI';
export type Frequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export async function createDelegatedInvoice(input:{tenant_id:string;type:InvoiceType;total_amount:number;currency?:string;issue_date:string;due_date:string;contact_name?:string|null}){const{data,error}=await(supabase as any).rpc('denarius_create_invoice',{p_tenant_id:input.tenant_id,p_type:input.type,p_total_amount:input.total_amount,p_currency:input.currency??'CLP',p_issue_date:input.issue_date,p_due_date:input.due_date,p_contact_name:input.contact_name??null});if(error)throw error;return{id:data.id}}
export async function createDelegatedRecurring(input:{tenant_id:string;type:TxType;name:string;amount:number;frequency:Frequency;next_date:string}){const{data,error}=await(supabase as any).rpc('denarius_create_recurring',{p_tenant_id:input.tenant_id,p_type:input.type,p_name:input.name,p_amount:input.amount,p_frequency:input.frequency,p_next_date:input.next_date});if(error)throw error;return{id:data.id}}

// Resultado de la extracción IA de un PDF (Human-in-the-Loop: pre-llena el form).
// Escudo anti-basura: is_valid_invoice=false bloquea cotizaciones/presupuestos.
export interface ParsedInvoice {
  is_valid_invoice: boolean;
  rejection_reason: string | null;
  extracted_fields: {
    type: InvoiceType | null;
    contact_name: string | null;
    total_amount: number | null;
    currency: string | null;
    issue_date: string | null;
    due_date: string | null;
  };
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  warnings: string[];
}

// ── Tenant ──────────────────────────────────────────────────
export async function getDefaultTenant(): Promise<Tenant | null> {
  // RLS limita a los tenants del usuario; tomamos el más antiguo como default.
  const { data, error } = await supabase.rpc('get_active_denarius_tenant');
  if (error) throw error;
  return data;
}
export async function listDenariusTenants():Promise<Tenant[]>{const{data,error}=await supabase.rpc('list_denarius_tenants');if(error)throw error;return data??[]}
export async function setActiveDenariusTenant(tenantId:string):Promise<Tenant>{const{data,error}=await supabase.rpc('set_active_denarius_tenant',{p_tenant_id:tenantId});if(error)throw error;return data}
export async function resetDenariusDemoPyme():Promise<Tenant>{const{data,error}=await supabase.rpc('reset_denarius_demo_pyme');if(error)throw error;return data}
export async function resetDenariusDemoStartup():Promise<Tenant>{const{data,error}=await supabase.rpc('reset_denarius_demo_startup');if(error)throw error;return data}
export type TeamRoleTemplate={key:string;name:string;description:string;permissions:string[];assignable:boolean;sort_order:number};
export type TeamWorkspace={templates:TeamRoleTemplate[];members:Array<{user_id:string;role_key:string;status:string;created_at:string}>;invites:Array<{id:string;email:string|null;role_key:string;expires_at:string;accepted_at:string|null;revoked_at:string|null;created_at:string}>};
export async function getTeamWorkspace(tenantId:string):Promise<TeamWorkspace>{const{data,error}=await (supabase as any).rpc('denarius_team_workspace',{p_tenant_id:tenantId});if(error)throw error;return data as TeamWorkspace}
export async function createTeamInvite(input:{tenantId:string;roleKey:string;email:string;days:number}){const{data,error}=await (supabase as any).rpc('create_denarius_team_invite',{p_tenant_id:input.tenantId,p_role_key:input.roleKey,p_email:input.email||null,p_days:input.days});if(error)throw error;return data as{id:string;token:string;expires_at:string}}
export async function acceptTeamInvite(token:string):Promise<string>{const{data,error}=await (supabase as any).rpc('accept_denarius_team_invite',{p_token:token});if(error)throw error;return data as string}
export async function revokeTeamInvite(id:string):Promise<boolean>{const{data,error}=await (supabase as any).rpc('revoke_denarius_team_invite',{p_invite_id:id});if(error)throw error;return data as boolean}
export async function updateTeamMemberRole(tenantId:string,userId:string,roleKey:string){const{error}=await(supabase as any).rpc('update_denarius_team_member_role',{p_tenant_id:tenantId,p_user_id:userId,p_role_key:roleKey});if(error)throw error}
export async function setTeamMemberStatus(tenantId:string,userId:string,status:'ACTIVE'|'SUSPENDED'){const{error}=await(supabase as any).rpc('set_denarius_team_member_status',{p_tenant_id:tenantId,p_user_id:userId,p_status:status});if(error)throw error}
export async function removeTeamMember(tenantId:string,userId:string){const{error}=await(supabase as any).rpc('remove_denarius_team_member',{p_tenant_id:tenantId,p_user_id:userId});if(error)throw error}
export async function getClaudeGrant(tenantId:string){const{data,error}=await(supabase as any).rpc('get_denarius_mcp_oauth_grant',{p_tenant_id:tenantId});if(error)throw error;return data as{tenant_id:string;scopes:string[]}}
export async function saveClaudeGrant(tenantId:string,scopes:string[]){const{data,error}=await(supabase as any).rpc('set_denarius_mcp_oauth_grant',{p_tenant_id:tenantId,p_scopes:scopes});if(error)throw error;return data as{tenant_id:string;scopes:string[]}}
export async function ensureDenariusTenant():Promise<Tenant>{const{data,error}=await supabase.rpc('ensure_denarius_tenant');if(error)throw error;return data}
export async function saveCompanyContext(input:{tenantId:string;name:string;acceptTerms:boolean;acceptPrivacy:boolean}):Promise<Tenant>{const{data,error}=await supabase.rpc('save_company_context',{p_tenant_id:input.tenantId,p_name:input.name,p_country_code:'CL',p_base_currency:'CLP',p_timezone:'America/Santiago',p_accept_terms:input.acceptTerms,p_accept_privacy:input.acceptPrivacy,p_legal_version:'2026-08-10'});if(error)throw error;return data}

export interface DenariusAccessContext { business_model: BusinessModel; can_change_business_model: boolean; role: 'owner'|'finance_manager'|'operator'|'viewer'|'advisor'|'platform_admin';permissions:string[];read_only:boolean }
export async function getDenariusAccessContext(tenantId:string):Promise<DenariusAccessContext>{const{data,error}=await supabase.rpc('denarius_access_context',{p_tenant_id:tenantId});if(error)throw error;return data as unknown as DenariusAccessContext}

export async function getUnitEconomicsInput(tenantId:string,period:string){const{data,error}=await(supabase as any).rpc('denarius_run_as_tenant_owner',{p_tenant_id:tenantId,p_permission:'financial.read',p_operation:'close.inputs.read',p_payload:{period}});if(error)throw error;return data as {acquisition_spend:number;delivery_costs:number;units_sold:number|null;customers_acquired:number|null}|null}

export async function saveBusinessModelProfile(input: {
  tenantId: string;
  model: BusinessModel;
  source: 'diagnostic' | 'manual';
  answers?: DiagnosticAnswers;
}): Promise<Tenant> {
  const { data, error } = await supabase.rpc('set_business_model_profile', {
    p_tenant_id: input.tenantId,
    p_business_model: input.model,
    p_source: input.source,
    p_profile: input.answers ?? {},
  });
  if (error) throw error;
  return data;
}

export async function completeFinancialOnboarding(input: { tenantId: string; accountName: string; openingBalance: number; monthlyIncome: number; monthlyCosts: number; firstProjectionDate: string }): Promise<void> {
  const { error } = await supabase.rpc('complete_financial_onboarding', {
    p_tenant_id: input.tenantId,
    p_account_name: input.accountName,
    p_opening_balance: input.openingBalance,
    p_monthly_income: input.monthlyIncome,
    p_monthly_costs: input.monthlyCosts,
    p_first_projection_date: input.firstProjectionDate,
  });
  if (error) throw error;
}

export interface DenariusApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  rotated_from_id: string | null;
  replacement_key_id: string | null;
  rotation_grace_ends_at: string | null;
}

export interface CreatedDenariusApiKey {
  id: string;
  secret: string;
  prefix: string;
  scopes: string[];
}

export interface ActivationStatus { first_projection_at:string|null;first_connection_at:string|null;first_mcp_query_at:string|null;projection_completed:boolean;connection_created:boolean;mcp_query_completed:boolean;activated:boolean;time_to_first_mcp_hours:number|null }
export async function getActivationStatus(tenantId:string):Promise<ActivationStatus>{const {data,error}=await supabase.rpc('activation_status',{p_tenant_id:tenantId});if(error)throw error;return data as unknown as ActivationStatus}

export interface RotatedDenariusApiKey extends CreatedDenariusApiKey {
  rotated_from_id: string;
  grace_ends_at: string;
}

export async function listDenariusApiKeys(tenantId: string): Promise<DenariusApiKey[]> {
  const { data, error } = await supabase.rpc('list_denarius_api_keys', { p_tenant_id: tenantId });
  if (error) throw error;
  return data ?? [];
}

export async function createDenariusApiKey(input: {
  tenantId: string;
  name: string;
  expiresAt: string | null;
  scopes?: string[];
}): Promise<CreatedDenariusApiKey> {
  const { data, error } = await supabase.rpc('create_denarius_api_key', {
    p_tenant_id: input.tenantId,
    p_name: input.name,
    p_expires_at: input.expiresAt,
    p_scopes: input.scopes ?? ['financial:read'],
  });
  if (error) throw error;
  return data as unknown as CreatedDenariusApiKey;
}

export async function revokeDenariusApiKey(keyId: string): Promise<void> {
  const { data, error } = await supabase.rpc('revoke_denarius_api_key', { p_key_id: keyId });
  if (error) throw error;
  if (!data) throw new Error('La clave no existe o no pertenece a tu cuenta.');
}

export async function rotateDenariusApiKey(input: { keyId: string; graceMinutes: number; expiresAt: string | null }): Promise<RotatedDenariusApiKey> {
  const { data, error } = await supabase.rpc('rotate_denarius_api_key', { p_key_id: input.keyId, p_grace_minutes: input.graceMinutes, p_expires_at: input.expiresAt });
  if (error) throw error;
  return data as unknown as RotatedDenariusApiKey;
}

export interface CopilotHistoryEntry { id:string;tenant_id:string;question:string;answer_summary:string;tool_name:FinancialToolName;as_of:string;deep_link:string;evidence:EvidenceItem[];created_at:string }
export async function listCopilotHistory(tenantId:string,toolName:FinancialToolName|null=null):Promise<CopilotHistoryEntry[]>{const {data,error}=await supabase.rpc('list_copilot_history',{p_tenant_id:tenantId,p_tool_name:toolName,p_limit:50});if(error)throw error;return (data??[]) as unknown as CopilotHistoryEntry[]}
export async function saveCopilotHistory(input:{tenantId:string;question:string;answer:string;tool:FinancialToolName;asOf:string;deepLink:string;evidence:EvidenceItem[]}):Promise<string>{const {data,error}=await supabase.rpc('save_copilot_history',{p_tenant_id:input.tenantId,p_question:input.question,p_answer_summary:input.answer,p_tool_name:input.tool,p_as_of:input.asOf,p_deep_link:input.deepLink,p_evidence:input.evidence as unknown as Json});if(error)throw error;return data}
export async function deleteCopilotHistory(tenantId:string,entryId:string|null):Promise<number>{const {data,error}=await supabase.rpc('delete_copilot_history',{p_tenant_id:tenantId,p_entry_id:entryId});if(error)throw error;return data}

// Settings del tenant (impuestos + alertas) vía Edge Function (contrato Fase 2).
export async function updateTenantSettings(input: {
  tenant_id: string;
  default_tax_rate: number;
  weekly_alerts_enabled: boolean;
}): Promise<void> {
  const { error } = await supabase.functions.invoke('cashflow-tenant-settings', { body: input, method: 'PATCH' });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json();
        if (body?.message) msg = body.message;
      }
    } catch { /* noop */ }
    throw new Error(msg);
  }
}

// ── Bank accounts ───────────────────────────────────────────
export async function listAccounts(tenantId: string): Promise<BankAccount[]> {
  const { data, error } = await supabase.from('bank_account').select('*').eq('tenant_id', tenantId).order('created_at');
  if (error) throw error;
  return data;
}

export async function createAccount(input: {
  tenant_id: string;
  owner_id: string;
  name: string;
  currency?: string;
  current_balance?: number;
}): Promise<BankAccount> {
  const { data, error } = await supabase.from('bank_account').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateAccount(
  id: string,
  patch: Partial<Pick<BankAccount, 'name' | 'currency' | 'current_balance'>>,
): Promise<void> {
  const { error } = await supabase.from('bank_account').update(patch).eq('id', id);
  if (error) throw error;
}

// ON DELETE CASCADE elimina también las transacciones de la cuenta.
export async function deleteAccount(id: string): Promise<void> {
  const { error } = await supabase.from('bank_account').delete().eq('id', id);
  if (error) throw error;
}

// ── Transactions ────────────────────────────────────────────
export async function listTransactions(tenantId: string): Promise<Transaction[]> {
  const { data: accounts, error: accountsError } = await supabase.from('bank_account').select('id').eq('tenant_id', tenantId);
  if (accountsError) throw accountsError;
  if (!accounts?.length) return [];
  const { data, error } = await supabase
    .from('transaction')
    .select('*')
    .in('account_id', accounts.map((account) => account.id))
    .order('transaction_date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createTransaction(input: {
  account_id: string;
  owner_id: string;
  amount: number;
  type: TxType;
  category?: string | null;
  transaction_date?: string;
}): Promise<Transaction> {
  const { data, error } = await (supabase as any).rpc('denarius_create_transaction',{p_account_id:input.account_id,p_amount:input.amount,p_type:input.type,p_category:input.category??null,p_transaction_date:input.transaction_date??new Date().toISOString().slice(0,10)});
  if (error) throw error;
  return data;
}

// El trigger de balance revierte el saldo de la cuenta al borrar.
export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transaction').delete().eq('id', id);
  if (error) throw error;
}

export type ImportPreview = { row: number; fingerprint: string; duplicate: boolean };
export type ImportResult = { batch_id: string; inserted: number; duplicates: number; total: number };

export async function previewTransactionImport(accountId: string, rows: ImportRow[]): Promise<ImportPreview[]> {
  const { data, error } = await supabase.rpc('preview_transaction_import', { p_account_id: accountId, p_rows: rows });
  if (error) throw error;
  return data as unknown as ImportPreview[];
}

export async function importTransactionsCsv(accountId: string, fileName: string, rows: ImportRow[]): Promise<ImportResult> {
  const { data, error } = await supabase.rpc('import_transactions_csv', { p_account_id: accountId, p_file_name: fileName, p_rows: rows });
  if (error) throw error;
  return data as unknown as ImportResult;
}

// ── Invoices ────────────────────────────────────────────────
export async function listInvoices(tenantId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoice')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('due_date', { ascending: true });
  if (error) throw error;
  return data;
}

// Creación vía Edge Function (contrato del PRD). NO insertamos directo para
// respetar la validación central (source_system MANUAL en Fase 1).
export async function createInvoice(input: {
  tenant_id: string;
  type: InvoiceType;
  total_amount: number;
  currency?: string;
  issue_date: string;
  due_date: string;
  contact_name?: string | null;
  source_system?: SourceSystem;
}): Promise<{ id: string }> {
  const { data, error } = await supabase.functions.invoke('cashflow-invoices', {
    body: { source_system: 'MANUAL', external_id: null, ...input },
  });
  if (error) {
    // El cuerpo de error de la función trae error_code/message.
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json();
        if (body?.message) msg = body.message;
      }
    } catch { /* noop */ }
    throw new Error(msg);
  }
  return data.data;
}

// Acciones sobre facturas: marcar pagada/cancelar (Resolution Center y lista general).
export async function updateInvoice(
  id: string,
  patch: Partial<Pick<Invoice, 'status' | 'due_date'>>,
): Promise<void> {
  const { error } = await (supabase as any).rpc('denarius_update_invoice',{p_invoice_id:id,p_status:patch.status??null,p_due_date:patch.due_date??null});
  if (error) throw error;
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase.from('invoice').delete().eq('id', id);
  if (error) throw error;
}

// ── Transacciones recurrentes (Run Rate + Burn Rate Autopilot) ──
export async function listRecurringTransactions(tenantId: string): Promise<RecurringTransaction[]> {
  const { data, error } = await supabase
    .from('recurring_transaction')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('next_date', { ascending: true });
  if (error) throw error;
  return data;
}

// Creación vía Edge Function (contrato del PRD parte 6: type IN/OUT).
export async function createRecurringTransaction(input: {
  tenant_id: string;
  type: TxType;
  name: string;
  amount: number;
  frequency: Frequency;
  next_date: string;
  currency?: string;
}): Promise<{ id: string }> {
  const { data, error } = await supabase.functions.invoke('cashflow-recurring', { body: input });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json();
        if (body?.message) msg = body.message;
      }
    } catch { /* noop */ }
    throw new Error(msg);
  }
  return data.data;
}

export async function deleteRecurringTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('recurring_transaction').delete().eq('id', id);
  if (error) throw error;
}

// Cuota Beta de lecturas de PDF (10/mes). Lee el contador del mes en curso.
export const PDF_MONTHLY_LIMIT = 10;
export const MAX_PDF_BYTES = 2 * 1024 * 1024;

export async function getPdfUsage(): Promise<number> {
  const period = new Date().toISOString().slice(0, 7); // YYYY-MM
  const { data, error } = await supabase
    .from('pdf_usage')
    .select('count')
    .eq('period', period)
    .maybeSingle();
  if (error) throw error;
  return data?.count ?? 0;
}

// ── Ingesta por PDF (IA) ────────────────────────────────────
// Sube el PDF al bucket privado bajo {uid}/{uuid}.pdf y lo manda a parsear.
// La función borra el archivo tras procesarlo. Devuelve los campos extraídos
// para PRE-LLENAR el formulario; el usuario revisa y guarda (Human-in-the-Loop).
export async function uploadAndParsePdf(ownerId: string, tenantId: string, file: File): Promise<ParsedInvoice> {
  const path = `${ownerId}/${crypto.randomUUID()}.pdf`;
  const { error: upErr } = await supabase.storage.from('cashflow_docs').upload(path, file, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (upErr) throw upErr;

  const { data, error } = await supabase.functions.invoke('cashflow-parse-pdf', {
    body: { tenant_id: tenantId, file_path: path, expected_type: 'AR_OR_AP' },
  });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json();
        if (body?.message) msg = body.message;
      }
    } catch { /* noop */ }
    throw new Error(msg);
  }
  return data.data as ParsedInvoice;
}
