import{supabase}from'@/lib/supabase';
export type ExperienceSurface='DASHBOARD'|'OPERATIONS'|'ALERTS'|'ACTION_PLAN'|'WEEKLY_CLOSE'|'MCP'|'LEARNING'|'DEMO'|'TEAM'|'OTHER';
export type ExperienceEvent='PAGE_VIEWED'|'DEMO_STARTED'|'LEARNING_OPENED'|'ALERTS_OPENED'|'ACTION_PLAN_OPENED'|'CLOSE_OPENED'|'CLOSE_COMPLETED'|'MCP_OPENED'|'MCP_KEY_CREATED'|'TEAM_OPENED';
export async function trackExperience(event:ExperienceEvent,surface:ExperienceSurface,tenantId:string|null=null){await(supabase as any).rpc('track_denarius_experience',{p_event_name:event,p_surface:surface,p_tenant_id:tenantId})}
export type BetaExperience={days:number;actors:number;events:number;funnel:Array<{label:string;event_name:string;actors:number}>;surfaces:Array<{surface:string;events:number}>;models:Array<{model:string;actors:number}>};
export async function getBetaExperience(days=30):Promise<BetaExperience>{const{data,error}=await(supabase as any).rpc('denarius_beta_experience',{p_days:days});if(error)throw error;return data as BetaExperience}
