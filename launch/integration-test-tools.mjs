import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(here, '..', '.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()]),
);

const URL = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !ANON || !SERVICE) throw new Error('Credenciales de test incompletas');

const admin = createClient(URL, SERVICE, { auth: { persistSession: false }, db: { schema: 'cashflow' } });
const client = createClient(URL, ANON, { auth: { persistSession: false }, db: { schema: 'cashflow' } });
const tag = Date.now();
const credentials = { email: `cf-test-tools-${tag}@scouttech.lat`, password: crypto.randomUUID() + 'Aa1!' };
let userId;
let failures = 0;

function assert(condition, message) {
  console.log(`${condition ? '✅' : '❌'} ${message}`);
  if (!condition) failures++;
}

async function invoke(body) {
  return client.functions.invoke('denarius-tools', { body });
}

try {
  const created = await admin.auth.admin.createUser({ ...credentials, email_confirm: true });
  userId = created.data.user?.id;
  assert(Boolean(userId), 'usuario temporal creado');
  const signed = await client.auth.signInWithPassword(credentials);
  assert(!signed.error, 'sesión autenticada');

  const tenantResult = await client.from('tenant').select('id').limit(1).single();
  const tenantId = tenantResult.data?.id;
  assert(Boolean(tenantId), 'tenant por defecto resuelto');

  if (tenantId && userId) {
    const account = await client.from('bank_account').insert({
      tenant_id: tenantId, owner_id: userId, name: 'Cuenta tools test', currency: 'CLP', current_balance: 1_000_000,
    }).select('id').single();
    if (account.data?.id) {
      await client.from('transaction').insert({
        account_id: account.data.id, owner_id: userId, type: 'OUT', amount: 300_000,
        transaction_date: new Date().toISOString().slice(0, 10), category: 'E09 consistency test',
      });
      await client.from('recurring_transaction').insert({
        tenant_id: tenantId, owner_id: userId, name: 'E09 recurring test', type: 'OUT',
        amount: 100_000, frequency: 'MONTHLY', next_date: new Date().toISOString().slice(0, 10),
      });
    }
    await client.from('invoice').insert({
      id: '00000000-0000-4000-8000-000000000123', tenant_id: tenantId, owner_id: userId,
      type: 'AR', status: 'PENDING', contact_name: 'Cliente escenario', due_date: '2026-08-20',
      total_amount: 250_000,
    });
  }

  for (const request of [
    { name: 'get_cash_position' },
    { name: 'get_runway_and_burn' },
    { name: 'list_overdue_invoices' },
    { name: 'get_cash_projection', arguments: { horizon_days: 90 } },
    { name: 'get_restricted_cash' },
    { name: 'explain_metric', arguments: { metric: 'runway' } },
    { name: 'get_financial_summary' },
    { name: 'explain_projection_point', arguments: { horizon_days: 90 } },
    { name: 'simulate_scenario', arguments: {
      horizon_days: 90, invoice_id: '00000000-0000-4000-8000-000000000123', delay_days: 20,
    } },
  ]) {
    const result = await invoke(request);
    assert(!result.error, `${request.name} responde 200`);
    assert(result.data?.tenant_id === tenantId, `${request.name} usa tenant de sesión`);
    assert(result.data?.as_of && result.data?.currency === 'CLP', `${request.name} incluye corte y moneda`);
    assert(Array.isArray(result.data?.sources), `${request.name} incluye fuentes`);
  }

  const scenario = await invoke({ name: 'simulate_scenario', arguments: {
    horizon_days: 90, invoice_id: '00000000-0000-4000-8000-000000000123', delay_days: 20,
  } });
  assert(scenario.data?.data?.persisted === false, 'escenario declara explicitamente que no persiste');
  const unchanged = await client.from('invoice').select('due_date').eq('id', '00000000-0000-4000-8000-000000000123').single();
  assert(unchanged.data?.due_date === '2026-08-20', 'simulacion no modifica la factura');

  const runwayTool = await invoke({ name: 'get_runway_and_burn' });
  const coreMetric = await client.rpc('financial_core_metrics', { p_tenant_id: tenantId });
  const saasMetric = await client.rpc('metrics_saas', { p_tenant_id: tenantId });
  assert(!coreMetric.error && !saasMetric.error, 'RPC financieras centrales responden');
  assert(
    runwayTool.data?.data?.monthly_burn === coreMetric.data?.monthly_burn,
    'copiloto y financial_core_metrics comparten burn',
  );
  assert(
    saasMetric.data?.burnRateWidget?.value === coreMetric.data?.monthly_burn,
    'dashboard SaaS y financial_core_metrics comparten burn',
  );
  assert(
    saasMetric.data?.runwayWidget?.value === coreMetric.data?.runway_months,
    'dashboard SaaS y financial_core_metrics comparten runway',
  );

  const injected = await invoke({ name: 'get_cash_position', tenant_id: '00000000-0000-4000-8000-000000000999' });
  assert(Boolean(injected.error), 'rechaza tenant_id proporcionado por el solicitante');

  const audits = await client.from('agent_tool_audit')
    .select('request_id,tool_name,status,latency_ms,tenant_id,owner_id')
    .eq('tenant_id', tenantId);
  assert(!audits.error, 'auditoria accesible mediante RLS para el propietario');
  assert((audits.data?.length ?? 0) >= 10, 'registra una traza por herramienta ejecutada');
  assert(audits.data?.every((row) => row.owner_id === userId && row.tenant_id === tenantId), 'trazas aisladas por usuario y tenant');
  assert(audits.data?.every((row) => row.status === 'SUCCESS' && row.latency_ms >= 0), 'trazas registran estado y latencia');
} catch (error) {
  console.error('❌ Excepción', error);
  failures++;
} finally {
  if (userId) {
    const deleted = await admin.auth.admin.deleteUser(userId);
    assert(!deleted.error, 'usuario temporal eliminado con cascade');
  }
}

if (failures) {
  console.error(`❌ denarius-tools: ${failures} fallo(s)`);
  process.exit(1);
}
console.log('✅ denarius-tools certificado con cero huella');
