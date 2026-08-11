import fs from 'node:fs'
import path from 'node:path'

const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/)
  .filter(line => /^\s*[A-Za-z_][A-Za-z0-9_]*\s*=/.test(line))
  .map(line => { const i=line.indexOf('='); return [line.slice(0,i).trim(),line.slice(i+1).trim().replace(/^(['"])(.*)\1$/,'$2')] }))
const token = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN
const ref = new URL(env.VITE_SUPABASE_URL).hostname.split('.')[0]
const files = ['20260807080000_denarius_api_keys.sql','20260807081000_denarius_api_key_principal.sql','20260807082000_denarius_service_schema_usage.sql','20260807083000_denarius_service_table_grants.sql']
const query = files.map(file => fs.readFileSync(path.resolve('supabase/migrations',file),'utf8')).join('\n')
const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`,{
  method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query}),
})
if(!response.ok) throw new Error(`${response.status}: ${await response.text()}`)
console.log('APPLIED E10 Denarius API key migrations')
