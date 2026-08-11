import { supabase } from './supabase';

export interface SaasRetentionPeriod {
  period: string;
  opening_mrr: number;
  expansion_mrr: number;
  contraction_mrr: number;
  churned_mrr: number;
  nrr: number | null;
  grr: number | null;
  opening_customers: number;
  churned_customers: number;
  logo_churn: number | null;
}

export interface SaasCohort {
  cohort: string;
  customers: number;
  starting_mrr: number;
  current_mrr: number;
  mrr_retention: number | null;
}

export interface SaasRetentionMetrics {
  current: Partial<SaasRetentionPeriod>;
  periods: SaasRetentionPeriod[];
  cohorts: SaasCohort[];
}

export async function getSaasRetentionMetrics(tenantId: string, months = 6): Promise<SaasRetentionMetrics> {
  const { data, error } = await supabase.rpc('saas_retention_metrics', { p_tenant_id: tenantId, p_months: months });
  if (error) throw error;
  return data as unknown as SaasRetentionMetrics;
}
