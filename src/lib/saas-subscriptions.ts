import { supabase } from './supabase';

export interface SaasSubscriptionRow {
  id: string;
  customer: string;
  plan: string;
  current_mrr: number;
  status: 'ACTIVE' | 'CHURNED';
  started_at: string;
  ended_at: string | null;
  renewal_date: string | null;
  renewal_owner: string | null;
  renewal_status: 'PENDING'|'IN_PROGRESS'|'RENEWED'|'WILL_NOT_RENEW';
  renewal_note: string | null;
}

export async function updateSaasRenewal(input:{id:string;renewalDate:string;owner:string;status:SaasSubscriptionRow['renewal_status'];note:string}){
  const {error}=await supabase.rpc('update_saas_renewal',{p_subscription_id:input.id,p_renewal_date:input.renewalDate,p_owner:input.owner,p_status:input.status,p_note:input.note||null});if(error)throw error;
}

export type SaasMrrEventType = 'NEW' | 'EXPANSION' | 'CONTRACTION' | 'CHURN' | 'REACTIVATION';

export interface SaasMrrEventRow {
  id: string;
  event_type: SaasMrrEventType;
  amount_delta: number;
  effective_date: string;
  previous_mrr: number | null;
  resulting_mrr: number | null;
  previous_plan: string | null;
  resulting_plan: string | null;
  note: string | null;
  created_at: string;
}

export async function listSaasSubscriptions(tenantId: string): Promise<SaasSubscriptionRow[]> {
  const { data, error } = await supabase.rpc('saas_subscription_workspace', { p_tenant_id: tenantId });
  if (error) throw error;
  return (data ?? []) as unknown as SaasSubscriptionRow[];
}

export async function createSaasSubscription(input: { tenantId: string; customer: string; plan: string; mrr: number; startedAt: string }) {
  const { error } = await supabase.rpc('create_saas_subscription', {
    p_tenant_id: input.tenantId, p_customer_name: input.customer, p_plan_name: input.plan,
    p_monthly_mrr: input.mrr, p_started_at: input.startedAt,
  });
  if (error) throw error;
}

export async function updateSaasSubscription(input: {
  id: string; mrr: number; plan: string; status: 'ACTIVE' | 'CHURNED'; effectiveDate: string; note?: string;
}): Promise<SaasMrrEventType> {
  const { data, error } = await supabase.rpc('update_saas_subscription', {
    p_subscription_id: input.id, p_new_mrr: input.mrr, p_new_plan_name: input.plan,
    p_status: input.status, p_effective_date: input.effectiveDate, p_note: input.note || null,
  });
  if (error) throw error;
  return data as SaasMrrEventType;
}

export async function listSaasSubscriptionHistory(id: string): Promise<SaasMrrEventRow[]> {
  const { data, error } = await supabase.rpc('saas_subscription_history', { p_subscription_id: id });
  if (error) throw error;
  return (data ?? []) as unknown as SaasMrrEventRow[];
}
