import fs from 'node:fs';
import path from 'node:path';

const env = Object.fromEntries(
  fs.readFileSync(path.resolve('.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((line) => /^\s*[A-Za-z_][A-Za-z0-9_]*\s*=/.test(line))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^(['"])(.*)\1$/, '$2')];
    }),
);

const token = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN;
const projectRef = new URL(env.VITE_SUPABASE_URL).hostname.split('.')[0];
const migrations = [
  '20260806230000_denarius_tool_catalog_v2.sql',
  '20260806231000_denarius_tool_catalog_v2_constraint_fix.sql',
];
const sql = migrations.map((file) => fs.readFileSync(path.resolve('supabase/migrations', file), 'utf8')).join('\n');
const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
});
if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
console.log('APPLIED E07 tool catalog migrations');
