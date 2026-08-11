import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd(); const failures=[]; const notices=[]
const migrationDir=path.join(root,'supabase','migrations')
const migrations=fs.readdirSync(migrationDir).filter(file=>file.endsWith('.sql')).sort()
const versions=new Map()

for(const file of migrations){
  const match=file.match(/^(\d{14})_[a-z0-9_]+\.sql$/)
  if(!match){failures.push(`${file}: nombre de migración inválido`);continue}
  if(versions.has(match[1]))failures.push(`${file}: versión duplicada con ${versions.get(match[1])}`)
  versions.set(match[1],file)
  const sql=fs.readFileSync(path.join(migrationDir,file),'utf8')
  for(const [pattern,label] of [[/\bdrop\s+table\b/i,'DROP TABLE'],[/\btruncate\b/i,'TRUNCATE'],[/\bdelete\s+from\s+auth\.users\b/i,'DELETE auth.users'],[/\balter\s+table[\s\S]{0,120}\brename\s+to\b/i,'RENAME TABLE']]){
    if(pattern.test(sql))failures.push(`${file}: operación destructiva requiere revisión manual (${label})`)
  }
  const definers=[...sql.matchAll(/security\s+definer/gi)]
  for(const occurrence of definers){
    const nearby=sql.slice(occurrence.index,occurrence.index+220)
    if(!/set\s+search_path\s*=/i.test(nearby))failures.push(`${file}: SECURITY DEFINER sin search_path explícito cerca de offset ${occurrence.index}`)
  }
}

const readTree=(dir)=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?readTree(path.join(dir,entry.name)):[path.join(dir,entry.name)]):[]
for(const file of [...readTree(path.join(root,'src')),...readTree(path.join(root,'mcp-desktop','src'))]){
  if(!/\.(ts|tsx|js)$/.test(file))continue
  const source=fs.readFileSync(file,'utf8')
  if(/SUPABASE_SERVICE_ROLE_KEY|service[_-]?role/i.test(source))failures.push(`${path.relative(root,file)}: service role no puede llegar a cliente`)
  if(/\bMSP\b/.test(source))failures.push(`${path.relative(root,file)}: terminología MSP no permitida en producto`)
}

const metadata=path.join(root,'supabase','functions','denarius-mcp-metadata','index.ts')
for(const file of readTree(path.join(root,'launch'))){
  if(!file.endsWith('.mjs'))continue
  const source=fs.readFileSync(file,'utf8')
  if(/password\s*:\s*(?:`Test-|['"]Test-)/.test(source))failures.push(`${path.relative(root,file)}: contraseña de prueba predecible; usar crypto.randomUUID()`)
}

for(const file of readTree(path.join(root,'supabase','functions'))){
  if(!file.endsWith('index.ts')||file===metadata)continue
  const source=fs.readFileSync(file,'utf8')
  if(/Access-Control-Allow-Origin['"]?\s*:\s*['"]\*['"]/.test(source))failures.push(`${path.relative(root,file)}: CORS wildcard no permitido`)
}

const activeDocs=['AGENT_GOLDEN_QUESTIONS.md','AGENT_PERMISSIONS.md','BACKLOG_DENARIUS_MCP.md','COPILOT_DATA_POLICY_V0.md','DENARIUS_MCP_PRODUCT.md','E09_SAAS_LIFECYCLE.md','E09_SAAS_RENEWALS.md']
for(const file of activeDocs){
  const source=fs.readFileSync(path.join(root,file),'utf8')
  if(/\bMSP\b/.test(source)&&file!=='BACKLOG_DENARIUS_MCP.md'&&file!=='DENARIUS_MCP_PRODUCT.md')failures.push(`${file}: terminología MSP aún presente`)
}

notices.push(`${migrations.length} migraciones con versiones únicas`)
notices.push('cliente sin service_role ni terminología MSP')
notices.push('credenciales temporales sin contraseñas predecibles')
notices.push('CORS de Edge Functions sin wildcard salvo metadata pública')
for(const notice of notices)console.log(`✅ ${notice}`)
if(failures.length){for(const failure of failures)console.error(`❌ ${failure}`);process.exit(1)}
console.log('✅ validación de plataforma aprobada')
