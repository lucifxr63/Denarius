import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .filter(line => line && !line.startsWith('#') && line.includes('='))
  .map(line => [line.slice(0,line.indexOf('=')).trim(),line.slice(line.indexOf('=')+1).trim()]))
const { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: anon, SUPABASE_SERVICE_ROLE_KEY: service } = env
if (!url || !anon || !service) throw new Error('Credenciales de certificación incompletas')

const admin = createClient(url,service,{auth:{persistSession:false},db:{schema:'cashflow'}})
const endpoint = `${url}/functions/v1/denarius-mcp`
const tag = Date.now()
const users = []
let failures = 0
const check = (condition,message) => { console.log(`${condition?'✅':'❌'} ${message}`); if(!condition) failures++ }

async function provision(label,balance) {
  const credentials={email:`cf-mcp-${label}-${tag}@scouttech.lat`,password: crypto.randomUUID() + 'Aa1!'}
  const created=await admin.auth.admin.createUser({...credentials,email_confirm:true})
  const userId=created.data.user?.id; if(!userId) throw created.error ?? new Error('user_create_failed')
  users.push(userId)
  const auth=createClient(url,anon,{auth:{persistSession:false},db:{schema:'cashflow'}})
  const signed=await auth.auth.signInWithPassword(credentials); if(signed.error) throw signed.error
  const client=createClient(url,anon,{auth:{persistSession:false},db:{schema:'cashflow'},global:{headers:{Authorization:`Bearer ${signed.data.session.access_token}`}}})
  const tenant=(await client.from('tenant').select('id').limit(1).single()).data
  if(!tenant?.id) throw new Error('tenant_missing')
  const account=(await client.from('bank_account').insert({tenant_id:tenant.id,owner_id:userId,name:`Cuenta ${label}`,currency:'CLP',current_balance:balance}).select('id').single()).data
  if(!account?.id) throw new Error('account_missing')
  await client.from('transaction').insert({account_id:account.id,owner_id:userId,type:'OUT',amount:100_000,transaction_date:new Date().toISOString().slice(0,10),category:'Certificación MCP'})
  await client.from('recurring_transaction').insert({tenant_id:tenant.id,owner_id:userId,name:`Recurrencia ${label}`,type:'OUT',amount:50_000,frequency:'MONTHLY',next_date:new Date().toISOString().slice(0,10)})
  const invoiceId=randomUUID(); const tomorrow=new Date(Date.now()+86_400_000).toISOString().slice(0,10)
  const yesterday=new Date(Date.now()-86_400_000).toISOString().slice(0,10)
  await client.from('invoice').insert([
    {id:invoiceId,tenant_id:tenant.id,owner_id:userId,type:'AR',status:'PENDING',contact_name:`Cliente ${label}`,due_date:tomorrow,total_amount:250_000},
    {id:randomUUID(),tenant_id:tenant.id,owner_id:userId,type:'AR',status:'PENDING',contact_name:`Vencido ${label}`,due_date:yesterday,total_amount:75_000},
  ])
  const key=await client.rpc('create_denarius_api_key',{p_tenant_id:tenant.id,p_name:`Certificación ${label}`})
  if(key.error||!key.data?.secret) throw key.error??new Error('key_missing')
  return {label,userId,tenantId:tenant.id,invoiceId,balance,client,key:key.data.secret}
}

async function mcp(key,method,params={}) {
  const response=await fetch(endpoint,{method:'POST',headers:{apikey:anon,'x-denarius-api-key':key,'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:randomUUID(),method,params})})
  return {status:response.status,body:await response.json()}
}

try {
  const a=await provision('A',1_100_000); const b=await provision('B',9_900_000)
  check(a.tenantId!==b.tenantId,'empresas temporales son distintas')
  const crossKey=await a.client.rpc('create_denarius_api_key',{p_tenant_id:b.tenantId,p_name:'Cruce prohibido'})
  check(Boolean(crossKey.error),'usuario A no puede crear una clave para empresa B')

  const requests=[
    ['get_cash_position',{}],['get_runway_and_burn',{}],['list_overdue_invoices',{}],
    ['get_cash_projection',{horizon_days:90}],['get_restricted_cash',{}],
    ['explain_metric',{metric:'runway'}],['get_financial_summary',{}],
    ['explain_projection_point',{horizon_days:90}],
    ['simulate_scenario',{horizon_days:90,invoice_id:a.invoiceId,delay_days:20}],
  ]
  for(const [name,args] of requests) {
    const result=await mcp(a.key,'tools/call',{name,arguments:args})
    const content=result.body?.result?.structuredContent
    check(result.status===200&&result.body?.result?.isError!==true,`${name} responde mediante API key`)
    check(content?.tenant_id===a.tenantId,`${name} conserva tenant A`)
    check(content?.as_of&&content?.currency==='CLP'&&Array.isArray(content?.sources),`${name} conserva evidencia`)
  }

  const cashA=(await mcp(a.key,'tools/call',{name:'get_cash_position',arguments:{}})).body.result.structuredContent
  const cashB=(await mcp(b.key,'tools/call',{name:'get_cash_position',arguments:{}})).body.result.structuredContent
  check(cashA.tenant_id===a.tenantId&&cashB.tenant_id===b.tenantId,'cada clave conserva su empresa')
  check(cashA.data.current_cash!==cashB.data.current_cash,'datos financieros A y B no se mezclan')

  const overdueA=(await mcp(a.key,'tools/call',{name:'list_overdue_invoices',arguments:{}})).body.result.structuredContent
  check(overdueA.data.every(invoice=>invoice.contact_name!=='Vencido B'),'A nunca recibe facturas de B')

  const forged=await mcp(a.key,'tools/call',{name:'get_cash_position',arguments:{tenant_id:b.tenantId}})
  check(forged.body?.result?.isError===true,'tenant_id forjado se rechaza')
  const write=await mcp(a.key,'tools/call',{name:'create_invoice',arguments:{}})
  check(write.body?.result?.isError===true||Boolean(write.body?.error),'herramienta de escritura no publicada se rechaza')
  const foreignScenario=await mcp(a.key,'tools/call',{name:'simulate_scenario',arguments:{horizon_days:90,invoice_id:b.invoiceId,delay_days:20}})
  check(foreignScenario.body?.result?.isError===true,'A no puede simular con una factura de B')
} catch(error) { console.error('❌ Excepción',error); failures++ }
finally {
  for(const userId of users.reverse()) check(!(await admin.auth.admin.deleteUser(userId)).error,`usuario temporal ${userId.slice(0,8)} eliminado`)
}
if(failures) process.exit(1)
console.log('✅ MCP cross-tenant y nueve herramientas certificados con cero huella')
