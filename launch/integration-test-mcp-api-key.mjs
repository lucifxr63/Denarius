import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(line=>line&&!line.startsWith('#')&&line.includes('=')).map(line=>[line.slice(0,line.indexOf('=')).trim(),line.slice(line.indexOf('=')+1).trim()]))
const admin=createClient(env.VITE_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false},db:{schema:'cashflow'}})
const client=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_ANON_KEY,{auth:{persistSession:false},db:{schema:'cashflow'}})
const tag=Date.now(); const credentials={email:`cf-test-key-${tag}@scouttech.lat`,password: crypto.randomUUID() + 'Aa1!'}
let userId; let keyId; let failures=0
const check=(ok,message)=>{console.log(`${ok?'✅':'❌'} ${message}`);if(!ok)failures++}
try{
  const created=await admin.auth.admin.createUser({...credentials,email_confirm:true}); userId=created.data.user?.id
  check(Boolean(userId),'usuario temporal creado')
  const session=await client.auth.signInWithPassword(credentials); check(Boolean(session.data.session),'sesión creada')
  const authed=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_ANON_KEY,{auth:{persistSession:false},db:{schema:'cashflow'},global:{headers:{Authorization:`Bearer ${session.data.session?.access_token}`}}})
  const tenant=await authed.from('tenant').select('id').limit(1).single(); check(Boolean(tenant.data?.id),'tenant automático resuelto')
  const key=await authed.rpc('create_denarius_api_key',{p_tenant_id:tenant.data?.id,p_name:'Integración temporal'}); keyId=key.data?.id
  check(/^dnr_live_[0-9a-f]{48}$/.test(key.data?.secret??''),'clave creada y entregada una vez')
  const resolved=await admin.rpc('resolve_denarius_api_key',{p_secret_hash:createHash('sha256').update(key.data.secret).digest('hex')})
  if(resolved.error||!resolved.data?.[0]) console.error('Resolución directa:',JSON.stringify({data:resolved.data,error:resolved.error}))
  const endpoint=`${env.VITE_SUPABASE_URL}/functions/v1/denarius-mcp`
  const call=()=>fetch(endpoint,{method:'POST',headers:{apikey:env.VITE_SUPABASE_ANON_KEY,'x-denarius-api-key':key.data.secret,'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'get_financial_summary',arguments:{}}})})
  const accepted=await call(); const payload=await accepted.json();
  if(!(accepted.ok&&payload.result?.structuredContent?.tenant_id===tenant.data.id)) console.error('Respuesta MCP:',accepted.status,JSON.stringify(payload))
  check(accepted.ok&&payload.result?.structuredContent?.tenant_id===tenant.data.id,'API key queda aislada a su tenant')
  check((await authed.rpc('revoke_denarius_api_key',{p_key_id:keyId})).data===true,'clave revocada')
  check((await call()).status===401,'clave revocada deja de autenticar')
}catch(error){console.error('❌ Excepción',error);failures++}
finally{if(userId)check(!(await admin.auth.admin.deleteUser(userId)).error,'usuario y clave temporal eliminados')}
if(failures)process.exit(1)
console.log('✅ MCP API key certificado con cero huella')
