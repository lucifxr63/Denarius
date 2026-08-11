import { supabase } from './supabase';
export interface SaasRiskAccount { customer_id:string; customer:string; mrr:number; share:number; score:number; risk_level:'LOW'|'MEDIUM'|'HIGH'; last_event:string|null; last_event_date:string|null; reasons:{recent_contraction?:boolean;concentration?:boolean} }
export interface SaasRiskReport { total_mrr:number; top_customer_concentration:number; top_three_concentration:number; at_risk_mrr:number; at_risk_customers:number; accounts:SaasRiskAccount[] }
export async function getSaasCustomerRisk(tenantId:string):Promise<SaasRiskReport>{const {data,error}=await supabase.rpc('saas_customer_risk',{p_tenant_id:tenantId});if(error)throw error;return data as unknown as SaasRiskReport;}
