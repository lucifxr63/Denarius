import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const manifestPath = process.argv[2]
if (!manifestPath) throw new Error('Uso: node scripts/rehearse-rollback.mjs <manifest.json>')

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const failures = []
const isHttps = value => typeof value === 'string' && /^https:\/\/[a-z0-9.-]+$/i.test(value)
const hashTree = directory => {
  const files = []
  const walk = current => fs.readdirSync(current, { withFileTypes: true }).forEach(entry => entry.isDirectory() ? walk(path.join(current, entry.name)) : files.push(path.join(current, entry.name)))
  walk(directory)
  const hash = crypto.createHash('sha256')
  files.sort().forEach(file => { hash.update(path.relative(directory, file).replaceAll('\\', '/')); hash.update(fs.readFileSync(file)) })
  return hash.digest('hex')
}

if (manifest.schemaVersion !== 1) failures.push('schemaVersion debe ser 1')
if (!/^[a-z0-9-]+$/i.test(manifest.releaseId ?? '')) failures.push('releaseId inválido')
if (!isHttps(manifest.productionUrl)) failures.push('productionUrl inválida')
if (!isHttps(manifest.frontend?.current)) failures.push('frontend.current inválido')
if (!isHttps(manifest.frontend?.rollbackTarget)) failures.push('frontend.rollbackTarget inválido')
if (manifest.frontend?.current === manifest.frontend?.rollbackTarget) failures.push('el objetivo de rollback debe ser una versión anterior')

for (const functionName of manifest.edgeFunctions ?? []) {
  const entrypoint = path.join('supabase', 'functions', functionName, 'index.ts')
  if (!fs.existsSync(entrypoint)) failures.push(`falta ${entrypoint}`)
  const artifactEntrypoint = path.join(manifest.edgeFunctionArtifact ?? '', 'supabase', 'functions', functionName, 'index.ts')
  if (!fs.existsSync(artifactEntrypoint)) failures.push(`falta artefacto estable ${artifactEntrypoint}`)
  else {
    const artifactDirectory = path.dirname(artifactEntrypoint)
    if (hashTree(artifactDirectory) !== manifest.edgeFunctionHashes?.[functionName]) failures.push(`hash inválido para ${functionName}`)
  }
}
if (!manifest.edgeFunctions?.length) failures.push('se requiere al menos una Edge Function')
if (manifest.database?.strategy !== 'forward-fix') failures.push('la base compartida sólo admite forward-fix')
if (manifest.database?.destructiveRollbackAllowed !== false) failures.push('el rollback destructivo debe estar prohibido')
for (const product of ['Denarius', 'Validus', 'Licitus', 'Animus']) {
  if (!manifest.database?.sharedProducts?.includes(product)) failures.push(`falta producto compartido: ${product}`)
}
if (failures.length) {
  failures.forEach(failure => console.error(`❌ ${failure}`))
  process.exit(1)
}

console.log(`✅ manifiesto ${manifest.releaseId} válido`)
console.log(`✅ frontend: vercel rollback ${manifest.frontend.rollbackTarget} --yes`)
for (const functionName of manifest.edgeFunctions) {
  console.log(`✅ function: npx supabase functions deploy ${functionName} --project-ref ${manifest.supabaseProjectRef} --workdir ${manifest.edgeFunctionArtifact}`)
}
console.log('✅ database: forward-fix aditivo; DROP/TRUNCATE/rename prohibidos')
console.log('✅ ensayo de rollback aprobado (sin modificar producción)')
