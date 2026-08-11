import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(line=>line&&!line.startsWith('#')&&line.includes('=')).map(line=>[line.slice(0,line.indexOf('=')).trim(),line.slice(line.indexOf('=')+1).trim()]))
const options={auth:{persistSession:false},db:{schema:'cashflow'}}
const admin=createClient(env.VITE_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,options)
const client=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_ANON_KEY,options)
const outsider=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_ANON_KEY,options)
const tag=Date.now();const users=[];let failures=0
const check=(condition,message)=>{console.log(`${condition?'✅':'❌'} ${message}`);if(!condition)failures++}
const createUser=async(label)=>{const credentials={email:`cf-test-csv-${label}-${tag}@scouttech.lat`,password: crypto.randomUUID() + 'Aa1!'};const created=await admin.auth.admin.createUser({...credentials,email_confirm:true});if(created.data.user)users.push(created.data.user.id);return credentials}
try{
  const ownerCredentials=await createUser('owner');const outsiderCredentials=await createUser('outsider')
  check(!(await client.auth.signInWithPassword(ownerCredentials)).error,'propietario autenticado')
  check(!(await outsider.auth.signInWithPassword(outsiderCredentials)).error,'usuario externo autenticado')
  const tenant=(await client.from('tenant').select('id').limit(1).single()).data
  const accountResult=await client.from('bank_account').insert({tenant_id:tenant.id,owner_id:users[0],name:'CSV test',currency:'CLP',current_balance:100000}).select().single()
  const account=accountResult.data;check(!accountResult.error&&Boolean(account),'cuenta temporal creada')
  const rows=[{date:'2026-08-01',amount:10000,type:'IN',description:'Venta CSV',reference:'CSV-1'},{date:'2026-08-02',amount:5000,type:'OUT',description:'Comisión CSV',reference:'CSV-2'}]
  const repeatedPreview=await client.rpc('preview_transaction_import',{p_account_id:account.id,p_rows:[rows[0],rows[0]]});check(!repeatedPreview.error&&!repeatedPreview.data[0].duplicate&&repeatedPreview.data[1].duplicate,'vista previa marca repeticiones dentro del archivo')
  const preview=await client.rpc('preview_transaction_import',{p_account_id:account.id,p_rows:rows});check(!preview.error&&preview.data.every(row=>!row.duplicate),'vista previa reconoce filas nuevas')
  const first=await client.rpc('import_transactions_csv',{p_account_id:account.id,p_file_name:'certificacion.csv',p_rows:rows});check(!first.error&&first.data.inserted===2&&first.data.duplicates===0,'primera importación inserta dos movimientos')
  const balanceAfterFirst=Number((await client.from('bank_account').select('current_balance').eq('id',account.id).single()).data?.current_balance);check(balanceAfterFirst===105000,'saldo refleja ingresos y egresos una sola vez')
  const secondPreview=await client.rpc('preview_transaction_import',{p_account_id:account.id,p_rows:rows});check(!secondPreview.error&&secondPreview.data.every(row=>row.duplicate),'vista previa detecta duplicados existentes')
  const second=await client.rpc('import_transactions_csv',{p_account_id:account.id,p_file_name:'certificacion.csv',p_rows:rows});check(!second.error&&second.data.inserted===0&&second.data.duplicates===2,'reimportar omite todos los duplicados')
  const finalBalance=Number((await client.from('bank_account').select('current_balance').eq('id',account.id).single()).data?.current_balance);check(finalBalance===balanceAfterFirst,'reimportar no modifica el saldo')
  const cross=await outsider.rpc('preview_transaction_import',{p_account_id:account.id,p_rows:rows});check(Boolean(cross.error),'otra empresa no puede previsualizar la cuenta')
}catch(error){console.error('❌ Excepción',error);failures++}finally{for(const id of users)check(!(await admin.auth.admin.deleteUser(id)).error,`usuario temporal ${id.slice(0,8)} eliminado`)}
if(failures)process.exit(1);console.log('✅ Importación CSV certificada con cero huella')
