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
        return [
          line.slice(0, index).trim(),
          line.slice(index + 1).trim().replace(/^(['"])(.*)\1$/, '$2'),
        ];
      }),
  );
}

const env = { ...loadEnv(path.resolve('.env.local')), ...process.env };
const token = env.SUPABASE_ACCESS_TOKEN;
const projectRef = new URL(env.VITE_SUPABASE_URL).hostname.split('.')[0];
if (!token) throw new Error('Falta SUPABASE_ACCESS_TOKEN');

const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

async function query(sql) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql, read_only: true }),
  });
  if (!response.ok) throw new Error(`Management API ${response.status}: ${await response.text()}`);
  return response.json();
}

const rls = await query(`
  select c.relname as table_name, c.relrowsecurity as rls_enabled,
         c.relforcerowsecurity as rls_forced
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'cashflow' and c.relkind = 'r'
  order by c.relname
`);

const policies = await query(`
  select tablename as table_name, policyname as policy_name, cmd,
         roles::text as roles, qual, with_check
  from pg_policies
  where schemaname = 'cashflow'
  order by tablename, policyname
`);

const routines = await query(`
  select p.proname as routine_name,
         pg_get_function_identity_arguments(p.oid) as arguments,
         p.prosecdef as security_definer,
         p.provolatile as volatility,
         p.proconfig as settings,
         has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
         has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
         has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute,
         position('auth.uid()' in pg_get_functiondef(p.oid)) > 0 as checks_auth_uid,
         position('owner_id' in pg_get_functiondef(p.oid)) > 0 as checks_owner_id
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'cashflow'
    and p.proname in ('check_and_increment_pdf_usage', 'fmt_clp_short', 'metrics_pyme', 'metrics_saas')
  order by p.proname
`);

const migrations = await query(`
  select version, name
  from supabase_migrations.schema_migrations
  order by version
`);

const testArtifacts = await query(`
  select
    (select count(*)::int from auth.users where email like 'cf-test-%@scouttech.lat') as temp_users,
    (select count(*)::int from storage.objects where bucket_id = 'cashflow_docs'
      and name ~ '^[0-9a-f-]{36}/') as cashflow_docs_objects
`);

console.log(JSON.stringify({
  auditedAt: new Date().toISOString(),
  projectRef,
  rls,
  policies,
  routines,
  migrations,
  testArtifacts,
}, null, 2));

const expectedTables = new Set([
  'agent_tool_audit', 'bank_account', 'expense', 'invoice', 'partner_contributions', 'pdf_usage',
  'profiles', 'recurring_transaction', 'revenue', 'tenant', 'transaction',
]);
const rlsByTable = new Map(rls.map((row) => [row.table_name, row.rls_enabled]));
const missingRls = [...expectedTables].filter((table) => !rlsByTable.get(table));
const missingMetrics = ['metrics_pyme', 'metrics_saas'].filter(
  (name) => !routines.some((routine) => routine.routine_name === name),
);
const anonymousRoutines = routines
  .filter((routine) => routine.anon_execute)
  .map((routine) => routine.routine_name);
const migrationVersions = new Set(migrations.map((migration) => migration.version));
const missingMigrations = ['20260624120000', '20260806210000', '20260806220000', '20260806230000', '20260806231000']
  .filter((version) => !migrationVersions.has(version));

if (missingRls.length || missingMetrics.length || anonymousRoutines.length || missingMigrations.length) {
  console.error(JSON.stringify({ missingRls, missingMetrics, anonymousRoutines, missingMigrations }, null, 2));
  process.exitCode = 1;
}
