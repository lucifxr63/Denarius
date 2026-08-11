import { createClient } from 'npm:@supabase/supabase-js@2';
import { parseToolRequest, projectionAnalysis, projectionSummary, TOOL_NAVIGATION, toolEvidence, TOOL_VERSION } from './core.ts';

const RELEASE_ID = '2026-08-07-ops103-104';

const allowedOrigins = new Set([
  'https://denarius.scouttech.lat',
  'https://cashflow-phi-nine.vercel.app',
  'http://localhost:5174',
]);

function cors(origin: string | null) {
  const allowed = origin && allowedOrigins.has(origin) ? origin : 'https://denarius.scouttech.lat';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(status: number, body: unknown, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin);

  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return json(401, { error: 'missing_authorization' }, origin);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json(500, { error: 'server_misconfigured' }, origin);

  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const internalPrincipal = authorization === `Bearer ${serviceRoleKey}`;
  const principalOwnerId = internalPrincipal ? request.headers.get('x-denarius-owner-id') : null;
  const principalTenantId = internalPrincipal ? request.headers.get('x-denarius-tenant-id') : null;
  const principalKeyId = internalPrincipal ? request.headers.get('x-denarius-key-id') : null;
  if (internalPrincipal && (![principalOwnerId, principalTenantId, principalKeyId].every(value => value && uuid.test(value)))) {
    return json(401, { error: 'invalid_internal_principal' }, origin);
  }

  const client = createClient(supabaseUrl, internalPrincipal ? serviceRoleKey : anonKey, {
    db: { schema: 'cashflow' },
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  let ownerId = principalOwnerId;
  if (!internalPrincipal) {
    const accessToken = authorization.slice('Bearer '.length);
    const { data: userData, error: userError } = await client.auth.getUser(accessToken);
    if (userError || !userData.user) return json(401, { error: 'invalid_session' }, origin);
    ownerId = userData.user.id;
  }

  let toolRequest;
  try {
    toolRequest = parseToolRequest(await request.json());
  } catch (error) {
    return json(400, { error: 'invalid_request', message: error instanceof Error ? error.message : 'Solicitud inválida' }, origin);
  }

  let tenantQuery = client
    .from('tenant')
    .select('id, default_tax_rate')
    .eq('owner_id', ownerId!);
  if (internalPrincipal) tenantQuery = tenantQuery.eq('id', principalTenantId!);
  const { data: tenant, error: tenantError } = await tenantQuery
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (tenantError) return json(500, { error: 'tenant_lookup_failed' }, origin);
  if (!tenant) return json(404, { error: 'tenant_not_found' }, origin);

  const asOf = new Date().toISOString().slice(0, 10);
  const requestId = crypto.randomUUID();
  const startedAt = performance.now();
  const envelope = (data: unknown, sources: Array<{ kind: string; name: string }>) => ({
    version: TOOL_VERSION,
    tool: toolRequest.name,
    tenant_id: tenant.id,
    as_of: asOf,
    currency: 'CLP',
    confidence: 'high',
    sources: sources.map((source) => ({ ...source, asOf })),
    navigation: TOOL_NAVIGATION[toolRequest.name],
    evidence: toolEvidence(toolRequest.name,data,asOf),
    data,
  });

  const audit = async (status: 'SUCCESS' | 'ERROR' | 'RATE_LIMITED') => {
    const { error } = await client.from('agent_tool_audit').insert({
      tenant_id: tenant.id,
      owner_id: ownerId!,
      api_key_id: principalKeyId,
      request_id: requestId,
      tool_name: toolRequest.name,
      status,
      channel: internalPrincipal ? 'MCP_API_KEY' : 'MCP_OAUTH',
      release_id: RELEASE_ID,
      latency_ms: Math.max(0, Math.round(performance.now() - startedAt)),
    });
    if (error) throw error;
  };

  const windowStart = new Date(Date.now() - 60_000).toISOString();
  const { count: recentCount, error: rateError } = await client.from('agent_tool_audit')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenant.id)
    .eq('owner_id', ownerId!)
    .gte('created_at', windowStart);
  if (rateError) return json(500, { error: 'rate_limit_check_failed' }, origin);
  if ((recentCount ?? 0) >= 30) {
    await audit('RATE_LIMITED').catch(() => undefined);
    return json(429, { error: 'rate_limit_exceeded', retry_after_seconds: 60 }, origin);
  }

  const success = async (data: unknown, evidence: Array<{ kind: string; name: string }>) => {
    await audit('SUCCESS');
    return json(200, envelope(data, evidence), origin);
  };

  const metricsPyme = () => internalPrincipal
    ? client.rpc('denarius_metrics_pyme', { p_tenant_id: tenant.id, p_owner_id: ownerId! })
    : client.rpc('metrics_pyme', { p_tenant_id: tenant.id });
  const metricsSaas = () => internalPrincipal
    ? client.rpc('denarius_metrics_saas', { p_tenant_id: tenant.id, p_owner_id: ownerId! })
    : client.rpc('metrics_saas', { p_tenant_id: tenant.id });
  const loadRunwayAndBurn = async () => {
    const { data, error } = internalPrincipal
      ? await client.rpc('denarius_financial_core_metrics', { p_tenant_id: tenant.id, p_owner_id: ownerId!, p_as_of: asOf })
      : await client.rpc('financial_core_metrics', { p_tenant_id: tenant.id, p_as_of: asOf });
    if (error) throw error;
    return data as {
      current_cash: number;
      gross_burn: number;
      monthly_burn: number;
      monthly_net: number;
      runway_months: number | null;
      period_start: string;
      period_end: string;
    };
  };

  try {
    if (toolRequest.name === 'get_cash_position') {
      const { data, error } = await metricsPyme();
      if (error) throw error;
      const payload = data as Record<string, { value?: number }>;
      const current = Number(payload.currentCashWidget?.value ?? 0);
      const restricted = Number(payload.restrictedCashWidget?.value ?? 0);
      return await success({ current_cash: current, restricted_cash: restricted, available_cash: current - restricted }, [
        { kind: 'table', name: 'bank_account' }, { kind: 'rpc', name: 'metrics_pyme' },
      ]);
    }

    if (toolRequest.name === 'get_runway_and_burn') {
      return await success(await loadRunwayAndBurn(), [
        { kind: 'rpc', name: 'financial_core_metrics' },
      ]);
    }

    if (toolRequest.name === 'list_overdue_invoices') {
      const { data, error } = await client.from('invoice')
        .select('id, contact_name, due_date, total_amount')
        .eq('tenant_id', tenant.id).eq('owner_id', ownerId!).eq('type', 'AR').eq('status', 'PENDING').lt('due_date', asOf)
        .order('due_date', { ascending: true }).limit(100);
      if (error) throw error;
      const todayMs = new Date(`${asOf}T00:00:00Z`).getTime();
      return await success((data ?? []).map((invoice) => ({
        ...invoice,
        days_overdue: Math.floor((todayMs - new Date(`${invoice.due_date}T00:00:00Z`).getTime()) / 86_400_000),
      })), [{ kind: 'table', name: 'invoice' }]);
    }

    if (toolRequest.name === 'get_restricted_cash') {
      const { data, error } = await metricsPyme();
      if (error) throw error;
      const metric = (data as Record<string, { value?: number; display?: string; note?: string }>).restrictedCashWidget ?? {};
      return await success({
        restricted_cash: Number(metric.value ?? 0),
        display: metric.display ?? '$0',
        note: metric.note ?? 'IVA neto + PPM del período',
      }, [{ kind: 'rpc', name: 'metrics_pyme' }]);
    }

    if (toolRequest.name === 'explain_metric') {
      const metric = toolRequest.arguments?.metric;
      if (metric === 'burn_rate' || metric === 'runway') {
        const result = await loadRunwayAndBurn();
        return await success({
          metric,
          value: metric === 'burn_rate' ? result.monthly_burn : result.runway_months,
          formula: metric === 'burn_rate'
            ? 'Neto mensual de transacciones de 90 días más recurrencias; burn es el déficit positivo.'
            : 'Caja actual dividida por burn mensual; infinito si no existe burn.',
          period_start: result.period_start,
          period_end: result.period_end,
        }, [{ kind: 'rpc', name: 'financial_core_metrics' }]);
      }
      const mapping: Record<string, { rpc: 'metrics_pyme' | 'metrics_saas'; widget: string; formula: string }> = {
        current_cash: { rpc: 'metrics_pyme', widget: 'currentCashWidget', formula: 'Suma de saldos de cuentas bancarias.' },
        restricted_cash: { rpc: 'metrics_pyme', widget: 'restrictedCashWidget', formula: 'IVA débito menos crédito fiscal, más PPM del período.' },
        working_capital: { rpc: 'metrics_pyme', widget: 'workingCapitalWidget', formula: 'Caja más cuentas por cobrar pendientes menos cuentas por pagar pendientes.' },
        burn_rate: { rpc: 'metrics_saas', widget: 'burnRateWidget', formula: 'Máximo entre cero y gastos menos ingresos del período.' },
        runway: { rpc: 'metrics_saas', widget: 'runwayWidget', formula: 'Caja actual dividida por burn mensual; infinito si no existe burn.' },
        mrr: { rpc: 'metrics_saas', widget: 'mrrWidget', formula: 'Ingresos netos registrados durante el mes seleccionado.' },
      };
      const definition = metric ? mapping[metric] : undefined;
      if (!definition) throw new Error('Métrica no permitida');
      const { data, error } = definition.rpc === 'metrics_pyme' ? await metricsPyme() : await metricsSaas();
      if (error) throw error;
      const widget = (data as Record<string, { value?: number | null; display?: string; note?: string }>)[definition.widget] ?? {};
      return await success({ metric, value: widget.value ?? null, display: widget.display ?? null, note: widget.note ?? null, formula: definition.formula }, [
        { kind: 'rpc', name: definition.rpc }, { kind: 'calculation', name: metric },
      ]);
    }

    if (toolRequest.name === 'get_financial_summary') {
      const [pyme, saas, runway, overdue] = await Promise.all([
        metricsPyme(),
        metricsSaas(),
        loadRunwayAndBurn(),
        client.from('invoice').select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id).eq('owner_id', ownerId!).eq('type', 'AR').eq('status', 'PENDING').lt('due_date', asOf),
      ]);
      if (pyme.error || saas.error || overdue.error) throw pyme.error ?? saas.error ?? overdue.error;
      const p = pyme.data as Record<string, { value?: number | null }>;
      const s = saas.data as Record<string, { value?: number | null }>;
      return await success({
        current_cash: Number(p.currentCashWidget?.value ?? 0),
        restricted_cash: Number(p.restrictedCashWidget?.value ?? 0),
        working_capital: Number(p.workingCapitalWidget?.value ?? 0),
        monthly_burn: runway.monthly_burn,
        runway_months: runway.runway_months,
        mrr: Number(s.mrrWidget?.value ?? 0),
        overdue_receivables_count: overdue.count ?? 0,
      }, [{ kind: 'rpc', name: 'metrics_pyme' }, { kind: 'rpc', name: 'financial_core_metrics' }, { kind: 'table', name: 'invoice' }]);
    }

    if (toolRequest.name === 'explain_projection_point') {
      const horizon = toolRequest.arguments?.horizon_days ?? 90;
      const [accounts, invoices, recurring] = await Promise.all([
        client.from('bank_account').select('current_balance').eq('tenant_id', tenant.id).eq('owner_id', ownerId!),
        client.from('invoice').select('type,status,total_amount,due_date').eq('tenant_id', tenant.id).eq('owner_id', ownerId!),
        client.from('recurring_transaction').select('type,amount,frequency,next_date').eq('tenant_id', tenant.id).eq('owner_id', ownerId!),
      ]);
      if (accounts.error || invoices.error || recurring.error) throw accounts.error ?? invoices.error ?? recurring.error;
      const currentCash = (accounts.data ?? []).reduce((sum, account) => sum + Number(account.current_balance), 0);
      return await success(projectionAnalysis(
        currentCash, invoices.data ?? [], recurring.data ?? [], asOf, horizon, Number(tenant.default_tax_rate),
      ), [
        { kind: 'table', name: 'bank_account' }, { kind: 'table', name: 'invoice' },
        { kind: 'table', name: 'recurring_transaction' }, { kind: 'calculation', name: 'projection_point_explanation' },
      ]);
    }

    if (toolRequest.name === 'simulate_scenario') {
      const horizon = toolRequest.arguments?.horizon_days ?? 90;
      const invoiceId = toolRequest.arguments?.invoice_id;
      const delayDays = toolRequest.arguments?.delay_days ?? 0;
      const [accounts, invoices, recurring] = await Promise.all([
        client.from('bank_account').select('current_balance').eq('tenant_id', tenant.id).eq('owner_id', ownerId!),
        client.from('invoice').select('id,type,status,total_amount,due_date').eq('tenant_id', tenant.id).eq('owner_id', ownerId!),
        client.from('recurring_transaction').select('type,amount,frequency,next_date').eq('tenant_id', tenant.id).eq('owner_id', ownerId!),
      ]);
      if (accounts.error || invoices.error || recurring.error) throw accounts.error ?? invoices.error ?? recurring.error;
      const target = (invoices.data ?? []).find((invoice) => invoice.id === invoiceId);
      if (!target || target.type !== 'AR' || target.status !== 'PENDING') {
        return json(404, { error: 'eligible_invoice_not_found' }, origin);
      }
      const currentCash = (accounts.data ?? []).reduce((sum, account) => sum + Number(account.current_balance), 0);
      const baseline = projectionSummary(currentCash, invoices.data ?? [], recurring.data ?? [], asOf, horizon, Number(tenant.default_tax_rate));
      const shiftedInvoices = (invoices.data ?? []).map((invoice) => {
        if (invoice.id !== invoiceId) return invoice;
        const shifted = new Date(`${invoice.due_date}T00:00:00Z`);
        shifted.setUTCDate(shifted.getUTCDate() + delayDays);
        return { ...invoice, due_date: shifted.toISOString().slice(0, 10) };
      });
      const scenario = projectionSummary(currentCash, shiftedInvoices, recurring.data ?? [], asOf, horizon, Number(tenant.default_tax_rate));
      return await success({
        persisted: false,
        scenario: { type: 'delay_receivable', invoice_id: invoiceId, delay_days: delayDays },
        baseline,
        result: scenario,
        impact: {
          lowest_balance: scenario.lowest_balance - baseline.lowest_balance,
          ending_balance: scenario.ending_balance - baseline.ending_balance,
        },
      }, [
        { kind: 'table', name: 'bank_account' }, { kind: 'table', name: 'invoice' },
        { kind: 'table', name: 'recurring_transaction' }, { kind: 'calculation', name: 'non_persistent_scenario' },
      ]);
    }

    const horizon = toolRequest.arguments?.horizon_days ?? 90;
    const [accounts, invoices, recurring] = await Promise.all([
      client.from('bank_account').select('current_balance').eq('tenant_id', tenant.id).eq('owner_id', ownerId!),
      client.from('invoice').select('type,status,total_amount,due_date').eq('tenant_id', tenant.id).eq('owner_id', ownerId!),
      client.from('recurring_transaction').select('type,amount,frequency,next_date').eq('tenant_id', tenant.id).eq('owner_id', ownerId!),
    ]);
    if (accounts.error || invoices.error || recurring.error) throw accounts.error ?? invoices.error ?? recurring.error;
    const currentCash = (accounts.data ?? []).reduce((sum, account) => sum + Number(account.current_balance), 0);
    return await success(projectionSummary(
      currentCash,
      invoices.data ?? [],
      recurring.data ?? [],
      asOf,
      horizon,
      Number(tenant.default_tax_rate),
    ), [
      { kind: 'table', name: 'bank_account' }, { kind: 'table', name: 'invoice' },
      { kind: 'table', name: 'recurring_transaction' }, { kind: 'calculation', name: 'cash_projection' },
    ]);
  } catch (error) {
    console.error('denarius-tools failed', error instanceof Error ? error.message : error);
    await audit('ERROR').catch(() => undefined);
    return json(500, { error: 'tool_execution_failed' }, origin);
  }
});
