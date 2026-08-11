import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bot, Check, Clipboard, KeyRound, LoaderCircle, RefreshCw, ShieldCheck, Trash2, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useConfirm } from '@/components/ui/confirm';
import { createDenariusApiKey, getActivationStatus, getClaudeGrant, getDefaultTenant, listDenariusApiKeys, revokeDenariusApiKey, rotateDenariusApiKey, saveClaudeGrant, type ActivationStatus, type DenariusApiKey } from '@/lib/queries';
import { trackExperience } from '@/lib/experience';

const inputClass = 'h-11 w-full rounded-lg border border-border bg-background px-3 text-base outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20';
const CLAUDE_CONNECTOR_URL='https://fcdhcntyvsydnvjwopfe.supabase.co/functions/v1/denarius-mcp';

function dateLabel(value: string | null) {
  if (!value) return 'Nunca';
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(new Date(value));
}

export function McpConnections() {
  const confirm = useConfirm();
  const secretRef = useRef<HTMLDivElement>(null);
  const [tenant, setTenant] = useState<{ id: string; name: string } | null>(null);
  const [keys, setKeys] = useState<DenariusApiKey[]>([]);
  const [name, setName] = useState('Mi asistente');
  const [duration, setDuration] = useState('90');
  const [scopes,setScopes]=useState<string[]>(['financial:read']);
  const [claudeScopes,setClaudeScopes]=useState<string[]>(['financial:read']);
  const [savingClaude,setSavingClaude]=useState(false);
  const [serverStatus,setServerStatus]=useState<'idle'|'testing'|'ready'|'error'>('idle');
  const [secret, setSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [rotationKeyId, setRotationKeyId] = useState('');
  const [rotationGrace, setRotationGrace] = useState('60');
  const [copied, setCopied] = useState(false);
  const [activation, setActivation] = useState<ActivationStatus | null>(null);

  const activeKeys = useMemo(() => keys.filter(key => !key.revoked_at), [keys]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const current = await getDefaultTenant();
        if (!current) throw new Error('No encontramos una empresa activa.');
        const [items,status,grant] = await Promise.all([listDenariusApiKeys(current.id),getActivationStatus(current.id),getClaudeGrant(current.id)]);
        if (alive) { setTenant(current); setKeys(items); setActivation(status);setClaudeScopes(grant.scopes); }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No pudimos cargar las conexiones.');
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => { if (secret) secretRef.current?.focus(); }, [secret]);

  async function createKey() {
    if (!tenant || !name.trim()) return;
    setCreating(true);
    try {
      const expiresAt = duration === 'never' ? null : new Date(Date.now() + Number(duration) * 86_400_000).toISOString();
      const created = await createDenariusApiKey({ tenantId: tenant.id, name: name.trim(), expiresAt, scopes });
      void trackExperience('MCP_KEY_CREATED', 'MCP', tenant.id).catch(() => undefined);
      setSecret(created.secret);
      setCopied(false);
      setKeys(await listDenariusApiKeys(tenant.id));
      setActivation(await getActivationStatus(tenant.id));
      toast.success('API key creada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No pudimos crear la API key.');
    } finally { setCreating(false); }
  }

  async function copySecret() {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    toast.success('Clave copiada');
  }
  async function saveClaude(){if(!tenant)return;setSavingClaude(true);try{await saveClaudeGrant(tenant.id,claudeScopes);toast.success('Permisos de Claude guardados')}catch(error){toast.error(error instanceof Error?error.message:'No pudimos guardar los permisos.')}finally{setSavingClaude(false)}}
  async function testServer(){setServerStatus('testing');try{const response=await fetch('https://fcdhcntyvsydnvjwopfe.supabase.co/functions/v1/denarius-mcp-metadata');if(!response.ok)throw new Error();setServerStatus('ready');toast.success('Servidor MCP disponible')}catch{setServerStatus('error');toast.error('No pudimos alcanzar el servidor MCP.')}}

  async function revoke(key: DenariusApiKey) {
    if (!await confirm({ title: `¿Revocar “${key.name}”?`, message: 'El asistente perderá acceso inmediatamente. Esta acción no se puede deshacer.', confirmLabel: 'Revocar', danger: true })) return;
    setRevoking(key.id);
    try {
      await revokeDenariusApiKey(key.id);
      setKeys(items => items.map(item => item.id === key.id ? { ...item, revoked_at: new Date().toISOString() } : item));
      toast.success('API key revocada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No pudimos revocar la clave.');
    } finally { setRevoking(null); }
  }

  async function rotate() {
    if (!tenant || !rotationKeyId) return;
    const key = keys.find((item) => item.id === rotationKeyId);
    if (!key) return;
    const graceMinutes = Number(rotationGrace);
    if (!await confirm({ title: `¿Rotar “${key.name}”?`, message: 'La clave actual seguirá activa durante el solapamiento. Copia la sucesora y actualiza tu cliente antes del vencimiento.', confirmLabel: 'Generar sucesora' })) return;
    setRotating(true);
    try {
      const expiresAt = duration === 'never' ? null : new Date(Date.now() + Number(duration) * 86_400_000).toISOString();
      const created = await rotateDenariusApiKey({ keyId: key.id, graceMinutes, expiresAt });
      setSecret(created.secret);
      setCopied(false);
      setKeys(await listDenariusApiKeys(tenant.id));
      setRotationKeyId('');
      toast.success(`Clave sucesora creada. La anterior vence ${dateLabel(created.grace_ends_at)}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No pudimos rotar la clave.');
    } finally { setRotating(false); }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/dashboard" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
            <ArrowLeft className="size-4" aria-hidden="true" /> Volver al dashboard
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"><Bot className="size-3.5" aria-hidden="true" /> MCP Desktop · Beta privada</span>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">Conecta tu asistente a Denarius</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">Consulta la caja de {tenant?.name ?? 'tu empresa'} desde un cliente compatible con MCP. Las claves sólo permiten lectura financiera y nunca permiten elegir otra empresa.</p>
        </div>

        <section className="mt-8 rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:p-6" aria-labelledby="claude-connector-title"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-sm font-semibold text-primary">Claude · conector remoto OAuth</p><h2 id="claude-connector-title" className="mt-1 text-xl font-bold">Conecta Denarius en tres pasos</h2><ol className="mt-4 grid gap-3 text-sm"><li><strong>1.</strong> Guarda los permisos de esta empresa.</li><li><strong>2.</strong> En Claude abre Configuración → Conectores → Agregar conector personalizado.</li><li><strong>3.</strong> Pega la URL, conecta tu cuenta y aprueba el acceso.</li></ol></div><div className="w-full max-w-lg rounded-xl border border-border bg-background p-4"><label className="text-xs font-semibold text-muted-foreground">URL del conector</label><button type="button" onClick={()=>void navigator.clipboard.writeText(CLAUDE_CONNECTOR_URL).then(()=>toast.success('URL copiada'))} className="mt-2 flex min-h-11 w-full cursor-pointer items-center gap-2 overflow-hidden rounded-lg border border-border px-3 text-left text-xs hover:bg-muted"><Clipboard className="size-4 shrink-0"/><span className="truncate">{CLAUDE_CONNECTOR_URL}</span></button><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={()=>void testServer()} disabled={serverStatus==='testing'}>{serverStatus==='testing'?<LoaderCircle className="size-4 animate-spin"/>:<Bot className="size-4"/>}{serverStatus==='ready'?'Servidor disponible':serverStatus==='error'?'Reintentar':'Probar servidor'}</Button><a href="https://claude.ai/settings/connectors" target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground">Abrir Claude</a></div></div></div><fieldset className="mt-6 border-t border-primary/15 pt-5"><legend className="text-sm font-semibold">Qué podrá hacer Claude en {tenant?.name??'esta empresa'}</legend><div className="mt-3 grid gap-3 sm:grid-cols-3">{[{scope:'financial:read',label:'Consultar finanzas',fixed:true},{scope:'alerts:read',label:'Estar atento a alertas'},{scope:'actions:write',label:'Crear y actualizar acciones'}].map(item=><label key={item.scope} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-border bg-background p-3 text-sm font-medium"><input type="checkbox" checked={claudeScopes.includes(item.scope)} disabled={item.fixed} onChange={e=>setClaudeScopes(current=>e.target.checked?[...current,item.scope]:current.filter(s=>s!==item.scope))} className="size-5 accent-primary"/>{item.label}</label>)}</div><Button className="mt-4" onClick={()=>void saveClaude()} disabled={savingClaude}>{savingClaude?<LoaderCircle className="size-4 animate-spin"/>:<ShieldCheck className="size-4"/>}Guardar permisos de Claude</Button></fieldset><details className="mt-5 rounded-xl border border-border bg-background p-4"><summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">Guion para probar el happy flow</summary><ol className="mt-3 grid gap-2 text-sm text-muted-foreground"><li>1. “Consulta mis alertas financieras y prioriza la más urgente.”</li><li>2. “Crea una acción para resolverla, asignada a Gerencia para el viernes.”</li><li>3. Revisa la solicitud de Claude y aprueba la herramienta.</li><li>4. Abre el Plan de acción en Denarius y confirma el resultado.</li></ol></details></section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.72fr)]">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="new-key-title">
            <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary"><KeyRound className="size-5" aria-hidden="true" /></span><div><h2 id="new-key-title" className="font-semibold">Nueva API key</h2><p className="mt-1 text-sm text-muted-foreground">Usa una clave diferente para cada dispositivo.</p></div></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="key-name" className="mb-1.5 block text-sm font-medium">Nombre del dispositivo</label><input id="key-name" className={inputClass} maxLength={80} value={name} onChange={event => setName(event.target.value)} /></div>
              <div><label htmlFor="key-duration" className="mb-1.5 block text-sm font-medium">Expiración</label><select id="key-duration" className={inputClass} value={duration} onChange={event => setDuration(event.target.value)}><option value="30">30 días</option><option value="90">90 días</option><option value="365">1 año</option><option value="never">Sin expiración</option></select></div>
            </div>
            <fieldset className="mt-5"><legend className="text-sm font-semibold">Permisos para este asistente</legend><p className="mt-1 text-xs text-muted-foreground">Agrega solamente lo necesario. Claude solicitará aprobación antes de escribir.</p><div className="mt-3 grid gap-3 sm:grid-cols-3">{[{scope:'financial:read',label:'Consultar finanzas',fixed:true},{scope:'alerts:read',label:'Consultar alertas'},{scope:'actions:write',label:'Crear y actualizar acciones'}].map(item=><label key={item.scope} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-border p-3 text-sm font-medium hover:bg-muted"><input type="checkbox" checked={scopes.includes(item.scope)} disabled={item.fixed} onChange={e=>setScopes(current=>e.target.checked?[...current,item.scope]:current.filter(s=>s!==item.scope))} className="size-5 accent-primary"/><span>{item.label}{item.fixed&&<small className="block text-xs font-normal text-muted-foreground">Obligatorio</small>}</span></label>)}</div></fieldset>
            <Button className="mt-5 w-full sm:w-auto" onClick={() => void createKey()} disabled={creating || loading || !tenant || !name.trim()}>{creating ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <KeyRound className="size-4" aria-hidden="true" />}{creating ? 'Generando…' : 'Generar API key'}</Button>

            {secret && <div ref={secretRef} tabIndex={-1} className="mt-6 rounded-xl border border-amber/35 bg-amber/10 p-4 outline-none focus:ring-2 focus:ring-amber/50" role="status"><div className="flex gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber" aria-hidden="true" /><div className="min-w-0 flex-1"><p className="font-semibold">Cópiala ahora: no volveremos a mostrarla</p><p className="mt-1 text-sm text-muted-foreground">Guárdala en el administrador seguro de tu cliente MCP.</p><code className="mt-3 block overflow-x-auto rounded-lg border border-border bg-background p-3 text-sm text-foreground">{secret}</code><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" onClick={() => void copySecret()}>{copied ? <Check className="size-4" aria-hidden="true" /> : <Clipboard className="size-4" aria-hidden="true" />}{copied ? 'Copiada' : 'Copiar clave'}</Button><Button size="sm" variant="ghost" onClick={() => setSecret(null)}>Ya la guardé</Button></div></div></div></div>}
          </section>

          <aside className="rounded-2xl border border-border bg-card p-5 sm:p-6"><h2 className="font-semibold">Protección incluida</h2><ul className="mt-4 space-y-3 text-sm text-muted-foreground">{['Sólo lectura financiera','Aislada a una empresa','Revocación inmediata','Cada llamada queda auditada'].map(item => <li key={item} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><span>{item}</span></li>)}</ul><div className="mt-6 rounded-xl border border-border bg-background/60 p-4"><p className="text-sm font-medium">Cliente Desktop</p><p className="mt-1 text-sm leading-6 text-muted-foreground">El instalador está en beta privada. La configuración para Claude Desktop y Cursor aparecerá aquí antes de abrir el acceso público.</p></div></aside>
        </div>

        {activation && <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="activation-title"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="activation-title" className="font-semibold">Activación de tu asistente</h2><p className="mt-1 text-sm text-muted-foreground">Denarius sólo registra si completaste cada hito, nunca el contenido de tus consultas.</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${activation.activated?'bg-primary/10 text-primary':'bg-muted text-muted-foreground'}`}>{activation.activated?'Activado':'En progreso'}</span></div><ol className="mt-5 grid gap-3 sm:grid-cols-3">{[{done:activation.projection_completed,label:'Primera proyección'},{done:activation.connection_created,label:'Conexión creada'},{done:activation.mcp_query_completed,label:'Primera consulta MCP'}].map(step=><li key={step.label} className="flex items-center gap-2 rounded-xl border border-border bg-background/60 p-3 text-sm font-medium">{step.done?<Check className="size-4 text-primary" aria-hidden="true"/>:<Circle className="size-4 text-muted-foreground" aria-hidden="true"/>}{step.label}</li>)}</ol></section>}

        {activeKeys.length > 0 && <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="rotate-key-title">
          <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary"><RefreshCw className="size-5" /></span><div><h2 id="rotate-key-title" className="font-semibold">Rotar una conexión</h2><p className="mt-1 text-sm text-muted-foreground">Genera una sucesora sin interrumpir inmediatamente el dispositivo actual.</p></div></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
            <label className="text-sm font-medium">Clave activa<select className={`${inputClass} mt-1.5`} value={rotationKeyId} onChange={(event)=>setRotationKeyId(event.target.value)}><option value="">Seleccionar…</option>{activeKeys.filter((key)=>!key.replacement_key_id).map((key)=><option key={key.id} value={key.id}>{key.name} · {key.prefix}</option>)}</select></label>
            <label className="text-sm font-medium">Solapamiento<select className={`${inputClass} mt-1.5`} value={rotationGrace} onChange={(event)=>setRotationGrace(event.target.value)}><option value="15">15 minutos</option><option value="60">1 hora</option><option value="1440">24 horas</option><option value="10080">7 días</option></select></label>
            <Button className="min-h-11" variant="outline" disabled={rotating||!rotationKeyId} onClick={()=>void rotate()}>{rotating?<LoaderCircle className="size-4 animate-spin"/>:<RefreshCw className="size-4"/>}Rotar</Button>
          </div>
        </section>}

        <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="keys-title">
          <div className="flex flex-wrap items-end justify-between gap-2"><div><h2 id="keys-title" className="font-semibold">Dispositivos conectados</h2><p className="mt-1 text-sm text-muted-foreground">{activeKeys.length} {activeKeys.length === 1 ? 'clave activa' : 'claves activas'}</p></div></div>
          {loading ? <div className="mt-6 flex min-h-24 items-center justify-center text-sm text-muted-foreground" role="status"><LoaderCircle className="mr-2 size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Cargando conexiones…</div> : keys.length === 0 ? <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center"><KeyRound className="mx-auto size-6 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium">Todavía no tienes dispositivos conectados</p><p className="mt-1 text-sm text-muted-foreground">Genera una clave para comenzar.</p></div> : <div className="mt-5 divide-y divide-border">{keys.map(key => { const inactive=Boolean(key.revoked_at)||(key.expires_at ? new Date(key.expires_at)<=new Date() : false); return <article key={key.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-semibold">{key.name}</h3><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${inactive?'bg-muted text-muted-foreground':'bg-primary/10 text-primary'}`}>{inactive?'Inactiva':'Activa'}</span></div><p className="mt-1 font-mono text-xs text-muted-foreground">{key.prefix}••••••••</p><p className="mt-1 text-xs text-muted-foreground">Último uso: {dateLabel(key.last_used_at)} · Expira: {dateLabel(key.expires_at)}</p></div>{!inactive&&<Button variant="outline" size="sm" className="min-h-11 text-danger hover:text-danger" disabled={revoking===key.id} onClick={() => void revoke(key)}>{revoking===key.id?<LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />:<Trash2 className="size-4" aria-hidden="true" />}Revocar</Button>}</article>})}</div>}
        </section>
      </main>
    </div>
  );
}
