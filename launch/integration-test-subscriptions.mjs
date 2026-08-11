import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .filter((line) => line && !line.startsWith('#') && line.includes('='))
  .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()]));
const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }, db: { schema: 'cashflow' } });
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false }, db: { schema: 'cashflow' } });
const tag = Date.now();
const credentials = { email: `cf-test-subscriptions-${tag}@scouttech.lat`, password: crypto.randomUUID() + 'Aa1!' };
let userId;
let failures = 0;
const check = (condition, message) => { console.log(`${condition ? '✅' : '❌'} ${message}`); if (!condition) failures++; };

try {
  const created = await admin.auth.admin.createUser({ ...credentials, email_confirm: true });
  userId = created.data.user?.id;
  check(Boolean(userId), 'usuario temporal creado');
  check(!(await client.auth.signInWithPassword(credentials)).error, 'sesión autenticada');
  const tenant = await client.from('tenant').select('id').limit(1).single();
  const tenantId = tenant.data?.id;
  check(Boolean(tenantId), 'tenant aislado resuelto');

  const create = async (customer, mrr, startedAt = new Date().toISOString().slice(0, 10)) => client.rpc('create_saas_subscription', {
    p_tenant_id: tenantId, p_customer_name: customer, p_plan_name: 'Growth', p_monthly_mrr: mrr,
    p_started_at: startedAt,
  });
  check(!(await create('Cliente Alpha', 100000)).error, 'crea primera suscripción y New MRR');
  check(!(await create('Cliente Beta', 50000)).error, 'crea segunda suscripción y New MRR');

  const workspace = await client.rpc('saas_subscription_workspace', { p_tenant_id: tenantId });
  check(!workspace.error && workspace.data.length === 2, 'workspace devuelve dos suscripciones propias');
  const alpha = workspace.data.find((row) => row.customer === 'Cliente Alpha');
  const beta = workspace.data.find((row) => row.customer === 'Cliente Beta');
  const expanded = await client.rpc('update_saas_subscription', { p_subscription_id: alpha.id, p_new_mrr: 125000, p_new_plan_name: 'Scale', p_status: 'ACTIVE', p_effective_date: new Date().toISOString().slice(0, 10), p_note: 'Upgrade certificado' });
  if (expanded.error) console.error(expanded.error);
  check(!expanded.error, 'registra expansión MRR');
  const churned = await client.rpc('update_saas_subscription', { p_subscription_id: beta.id, p_new_mrr: 50000, p_new_plan_name: 'Growth', p_status: 'CHURNED', p_effective_date: new Date().toISOString().slice(0, 10), p_note: 'Churn certificado' });
  if (churned.error) console.error(churned.error);
  check(!churned.error, 'registra churn MRR');

  const growth = await client.rpc('saas_growth_metrics', { p_tenant_id: tenantId, p_period: new Date().toISOString().slice(0, 7) });
  check(!growth.error, 'métricas SaaS responden');
  check(growth.data?.mrr === 125000, 'MRR final refleja altas, expansión y churn');
  check(growth.data?.new_mrr === 150000 && growth.data?.expansion_mrr === 25000 && growth.data?.churned_mrr === 50000, 'movimientos MRR se clasifican correctamente');
  check(growth.data?.active_customers === 1 && growth.data?.subscription_count === 1, 'clientes activos excluyen churn');
  const history = await client.rpc('saas_subscription_history', { p_subscription_id: alpha.id });
  check(!history.error && history.data?.length === 2, 'historial devuelve alta y expansión');
  check(history.data?.[0]?.event_type === 'EXPANSION' && history.data?.[0]?.previous_plan === 'Growth' && history.data?.[0]?.resulting_plan === 'Scale', 'historial conserva planes anterior y nuevo');
  check(history.data?.[0]?.note === 'Upgrade certificado', 'historial conserva motivo auditable');
  check(!(await client.rpc('update_saas_subscription', { p_subscription_id: beta.id, p_new_mrr: 60000, p_new_plan_name: 'Growth', p_status: 'ACTIVE', p_effective_date: new Date().toISOString().slice(0, 10), p_note: 'Retención' })).error, 'reactiva una suscripción churned');

  const previousMonth = new Date(); previousMonth.setUTCMonth(previousMonth.getUTCMonth() - 1);
  check(!(await create('Cliente Cohorte', 100000, previousMonth.toISOString().slice(0, 10))).error, 'crea base MRR del mes anterior');
  const cohortWorkspace = await client.rpc('saas_subscription_workspace', { p_tenant_id: tenantId });
  const cohortSubscription = cohortWorkspace.data.find((row) => row.customer === 'Cliente Cohorte');
  check(!(await client.rpc('update_saas_subscription', { p_subscription_id: cohortSubscription.id, p_new_mrr: 120000, p_new_plan_name: 'Scale', p_status: 'ACTIVE', p_effective_date: new Date().toISOString().slice(0, 10), p_note: 'Expansión de cohorte' })).error, 'expande una suscripción de la base inicial');
  const retention = await client.rpc('saas_retention_metrics', { p_tenant_id: tenantId, p_months: 2 });
  check(!retention.error, 'métricas de retención responden');
  check(retention.data?.current?.nrr === 1.2 && retention.data?.current?.grr === 1, 'NRR y GRR excluyen nuevo MRR del mes');
  check(retention.data?.current?.logo_churn === 0, 'logo churn usa clientes activos al inicio');
  check(retention.data?.cohorts?.some((cohort) => cohort.starting_mrr === 100000 && cohort.current_mrr === 120000), 'cohorte conserva MRR inicial y actual');
  const risk = await client.rpc('saas_customer_risk', { p_tenant_id: tenantId });
  check(!risk.error, 'reporte de riesgo responde');
  check(risk.data?.total_mrr === 305000, 'concentración usa MRR contractual activo');
  check(Number(risk.data?.top_customer_concentration) > 0.4 && Number(risk.data?.top_customer_concentration) < 0.42, 'detecta concentración superior al 40%');
  check(Number(risk.data?.at_risk_customers) === 1 && Number(risk.data?.at_risk_mrr) === 125000, 'clasifica MRR y clientes en riesgo');
  const alphaRisk = risk.data?.accounts?.find((account) => account.customer === 'Cliente Alpha');
  check(alphaRisk?.risk_level === 'MEDIUM' && alphaRisk?.reasons?.concentration === true, 'explica la alerta por concentración');
  const renewalDate=new Date();renewalDate.setUTCDate(renewalDate.getUTCDate()+5);
  const renewalUpdate=await client.rpc('update_saas_renewal',{p_subscription_id:alpha.id,p_renewal_date:renewalDate.toISOString().slice(0,10),p_owner:'Customer Success',p_status:'IN_PROGRESS',p_note:'Preparar propuesta'});
  check(!renewalUpdate.error,'programa renovación con responsable y estado');
  const renewals=await client.rpc('saas_renewal_workspace',{p_tenant_id:tenantId});
  check(!renewals.error&&renewals.data?.due_30_days===1,'agenda detecta renovación dentro de 30 días');
  check(Number(renewals.data?.mrr_due_30_days)===125000,'agenda cuantifica MRR por renovar');
  check(renewals.data?.items?.[0]?.urgency==='CRITICAL'&&renewals.data?.items?.[0]?.owner==='Customer Success','alerta incluye urgencia y responsable');
  check(Boolean(renewals.data?.items?.[0]?.suggested_action),'alerta propone una acción interna');
  const taskCreated=await client.rpc('create_financial_task',{p_tenant_id:tenantId,p_title:'Preparar renovación Alpha',p_priority:'URGENT',p_assignee:'Customer Success',p_due_date:renewalDate.toISOString().slice(0,10),p_subscription_id:alpha.id,p_source:'RENEWAL'});
  check(!taskCreated.error&&Boolean(taskCreated.data),'crea tarea financiera asociada a la suscripción');
  const taskId=taskCreated.data;
  let tasks=await client.rpc('financial_task_workspace',{p_tenant_id:tenantId});
  check(!tasks.error&&tasks.data?.open_count===1&&tasks.data?.urgent_count===1,'bandeja cuenta tareas abiertas y urgentes');
  check(tasks.data?.tasks?.[0]?.customer==='Cliente Alpha'&&tasks.data?.tasks?.[0]?.source==='RENEWAL','tarea conserva cliente y origen auditable');
  check(!(await client.rpc('comment_financial_task',{p_task_id:taskId,p_body:'Propuesta revisada internamente'})).error,'agrega comentario interno');
  check(!(await client.rpc('update_financial_task_status',{p_task_id:taskId,p_status:'IN_PROGRESS',p_comment:'CS inició seguimiento'})).error,'avanza estado con trazabilidad');
  tasks=await client.rpc('financial_task_workspace',{p_tenant_id:tenantId});
  const activityTypes=tasks.data?.tasks?.[0]?.activities?.map(activity=>activity.type)||[];
  check(activityTypes.includes('COMMENT')&&activityTypes.includes('STATUS_CHANGED'),'historial conserva comentarios y cambios de estado');
  check(!(await client.rpc('update_financial_task_status',{p_task_id:taskId,p_status:'DONE',p_comment:'Seguimiento completado'})).error,'completa tarea financiera');
  tasks=await client.rpc('financial_task_workspace',{p_tenant_id:tenantId});
  check(tasks.data?.open_count===0,'tarea completada sale del contador operativo');
} catch (error) {
  console.error('❌ Excepción', error);
  failures++;
} finally {
  if (userId) check(!(await admin.auth.admin.deleteUser(userId)).error, 'usuario temporal eliminado con cascade');
}
if (failures) process.exit(1);
console.log('✅ Suscripciones SaaS certificadas con cero huella');
