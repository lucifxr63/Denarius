import {supabase} from './supabase';
export interface RenewalItem{subscription_id:string;customer:string;plan:string;mrr:number;renewal_date:string;owner:string|null;status:string;note:string|null;days_remaining:number;urgency:'OVERDUE'|'CRITICAL'|'SOON'|'PLANNED';suggested_action:string}
export interface RenewalWorkspace{overdue:number;due_30_days:number;mrr_due_30_days:number;items:RenewalItem[]}
export async function getRenewalWorkspace(tenantId:string):Promise<RenewalWorkspace>{const{data,error}=await supabase.rpc('saas_renewal_workspace',{p_tenant_id:tenantId});if(error)throw error;return data as unknown as RenewalWorkspace;}
