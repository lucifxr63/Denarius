import fs from 'node:fs';
import path from 'node:path';

function loadEnv(file) {
  return Object.fromEntries(
    fs.readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter((line) => /^\s*[A-Za-z_][A-Za-z0-9_]*\s*=/.test(line))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^(['"])(.*)\1$/, '$2')];
      }),
  );
}

const env = { ...loadEnv(path.resolve('.env.local')), ...process.env };
const token = env.SUPABASE_ACCESS_TOKEN;
const projectRef = new URL(env.VITE_SUPABASE_URL).hostname.split('.')[0];
if (!token) throw new Error('Falta SUPABASE_ACCESS_TOKEN');

const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
const approvedFiles = [
  'supabase/reconciliation/20260624120000_mark_applied.sql',
  'supabase/migrations/20260806210000_cashflow_rpc_execute_hardening.sql',
];

for (const file of approvedFiles) {
  const sql = fs.readFileSync(path.resolve(file), 'utf8');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  if (!response.ok) throw new Error(`${file}: ${response.status} ${await response.text()}`);
  console.log(`APPLIED ${file}`);
}
