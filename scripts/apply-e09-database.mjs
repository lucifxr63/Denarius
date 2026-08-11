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
if (!token) throw new Error('Falta SUPABASE_ACCESS_TOKEN');
const file = 'supabase/migrations/20260807010000_financial_core_metrics.sql';
const query = fs.readFileSync(path.resolve(file), 'utf8');
const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query }),
});
if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
console.log('APPLIED E09 financial core metrics migration');
