import fs from 'node:fs'

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(line => /^\s*[A-Za-z_][A-Za-z0-9_]*\s*=/.test(line)).map(line => { const index = line.indexOf('='); return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^(['"])(.*)\1$/, '$2')] }))
const token = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN
const ref = new URL(env.VITE_SUPABASE_URL).hostname.split('.')[0]
const query = fs.readFileSync('supabase/migrations/20260807070000_msp_tasks.sql', 'utf8')
const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })
if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`)
console.log('APPLIED E09 MSP tasks migration')
