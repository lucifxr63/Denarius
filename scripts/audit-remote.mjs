import fs from 'node:fs';
import path from 'node:path';

function loadEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs.readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter((line) => /^\s*[A-Za-z_][A-Za-z0-9_]*\s*=/.test(line))
      .map((line) => {
        const index = line.indexOf('=');
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
        return [key, value];
      }),
  );
}

const env = { ...loadEnv(path.resolve('.env.local')), ...process.env };
const baseUrl = env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const schemaKey = env.SUPABASE_SERVICE_ROLE_KEY || anonKey;

if (!baseUrl || !anonKey) {
  console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY.');
  process.exit(1);
}

const expectedTables = [
  'bank_account',
  'expense',
  'invoice',
  'partner_contributions',
  'pdf_usage',
  'profiles',
  'recurring_transaction',
  'revenue',
  'tenant',
  'transaction',
];
const expectedRpcs = ['check_and_increment_pdf_usage', 'fmt_clp_short', 'metrics_pyme', 'metrics_saas'];
const expectedFunctions = [
  'cashflow-invoices',
  'cashflow-recurring',
  'cashflow-parse-pdf',
  'cashflow-tenant-settings',
  'cashflow-analytics',
  'cashflow-weekly-cron',
  'denarius-tools',
];

async function auditOpenApi() {
  const response = await fetch(`${baseUrl}/rest/v1/`, {
    headers: {
      apikey: schemaKey,
      Authorization: `Bearer ${schemaKey}`,
      Accept: 'application/openapi+json',
      'Accept-Profile': 'cashflow',
    },
  });
  if (!response.ok) {
    return { ok: false, status: response.status, detail: await response.text() };
  }

  const schema = await response.json();
  const paths = Object.keys(schema.paths ?? {});
  const tables = expectedTables.map((name) => ({
    name,
    present: paths.includes(`/${name}`),
  }));
  const rpcs = expectedRpcs.map((name) => ({
    name,
    present: paths.includes(`/rpc/${name}`),
  }));
  const tenantProperties = Object.keys(schema.definitions?.tenant?.properties ?? {});

  return {
    ok: true,
    status: response.status,
    tables,
    rpcs,
    tenantColumns: {
      business_model: tenantProperties.includes('business_model'),
      ppm_rate: tenantProperties.includes('ppm_rate'),
    },
  };
}

async function auditFunction(name) {
  const response = await fetch(`${baseUrl}/functions/v1/${name}`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://denarius.scouttech.lat',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization, apikey, content-type',
    },
  });
  return {
    name,
    status: response.status,
    allowOrigin: response.headers.get('access-control-allow-origin'),
    reachable: response.status >= 200 && response.status < 500,
  };
}

const openapi = await auditOpenApi();
const functions = [];
for (const name of expectedFunctions) functions.push(await auditFunction(name));

console.log(JSON.stringify({
  auditedAt: new Date().toISOString(),
  projectRef: new URL(baseUrl).hostname.split('.')[0],
  openapi,
  functions,
}, null, 2));

const failed = !openapi.ok
  || openapi.tables?.some((item) => !item.present)
  || openapi.rpcs?.some((item) => !item.present)
  || !openapi.tenantColumns?.business_model
  || !openapi.tenantColumns?.ppm_rate
  || functions.some((item) => !item.reachable);

process.exitCode = failed ? 1 : 0;
