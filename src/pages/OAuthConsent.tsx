import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Bot, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/auth'

type ConsentDetails = { authorization_id: string; client: { name?: string; client_name?: string }; redirect_uri: string; scope: string }

export function OAuthConsent() {
  const { session, loading: authLoading } = useAuth()
  const [params] = useSearchParams()
  const authorizationId = params.get('authorization_id') ?? ''
  const [details, setDetails] = useState<ConsentDetails>()
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const returnTo = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`

  useEffect(() => {
    if (!session || !authorizationId) return
    supabase.auth.oauth.getAuthorizationDetails(authorizationId).then(({ data, error: loadError }) => {
      if (loadError || !data) { setError('La solicitud de conexión no es válida o expiró.'); return }
      if ('redirect_url' in data) { window.location.assign(data.redirect_url); return }
      setDetails(data as ConsentDetails)
    })
  }, [session, authorizationId])

  if (!authLoading && !session) return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />
  if (!authorizationId) return <Navigate to="/dashboard" replace />

  const decide = async (approved: boolean) => {
    setSubmitting(true)
    const result = approved
      ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
      : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true })
    if (result.error || !result.data?.redirect_url) { setError('No se pudo registrar tu decisión.'); setSubmitting(false); return }
    window.location.assign(result.data.redirect_url)
  }

  return <main className="relative grid min-h-screen place-items-center px-4">
    <ThemeToggle className="absolute right-4 top-4" />
    <section className="w-full max-w-lg rounded-2xl border border-border bg-card p-7 shadow-xl">
      <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-primary/15 text-primary"><Bot /></div><div><h1 className="text-xl font-bold">Conectar con Denarius</h1><p className="text-sm text-muted-foreground">Autorización MCP segura</p></div></div>
      {error ? <p role="alert" className="mt-6 rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p> : !details ? <p className="mt-6 text-sm text-muted-foreground">Verificando solicitud…</p> : <>
        <p className="mt-6 text-sm"><strong>{details.client.name ?? details.client.client_name ?? 'Una aplicación MCP'}</strong> solicita consultar la información financiera de tu empresa.</p>
        <div className="mt-4 rounded-xl border border-border p-4 text-sm"><div className="flex gap-2"><ShieldCheck className="size-5 text-primary" /><div><strong>Permisos definidos en Denarius</strong><p className="mt-1 text-muted-foreground">Claude solo verá las herramientas autorizadas para tu empresa. Las acciones que escriben datos pedirán tu aprobación antes de ejecutarse.</p></div></div></div>
        <p className="mt-3 text-xs text-muted-foreground">Permisos solicitados: {details.scope || 'email'} · Podrás revocar el acceso posteriormente.</p>
        <div className="mt-6 flex justify-end gap-3"><Button variant="outline" disabled={submitting} onClick={() => void decide(false)}>Denegar</Button><Button disabled={submitting} onClick={() => void decide(true)}>Autorizar conexión</Button></div>
      </>}
    </section>
  </main>
}
