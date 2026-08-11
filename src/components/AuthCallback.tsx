import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { ensureDenariusTenant } from '@/lib/queries';

// Página a la que Google redirige tras el login (/auth/callback).
// supabase-js (detectSessionInUrl: true) intercambia el ?code= automáticamente,
// así que aquí NO se llama exchangeCodeForSession (el code es de un solo uso).
// Solo esperamos a que la sesión quede establecida y redirigimos al dashboard.
export function AuthCallback() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      let cancelled=false;
      void (async()=>{
      const returnTo = sessionStorage.getItem('denarius_auth_return_to');
      sessionStorage.removeItem('denarius_auth_return_to');
      const safeReturnTo = returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/dashboard';
      if(session){try{await ensureDenariusTenant()}catch{if(!cancelled)navigate('/login?error=account_setup',{replace:true});return}}
      if(!cancelled)navigate(session ? safeReturnTo : '/login', { replace: true });
      })();
      return()=>{cancelled=true};
    }
  }, [session, loading, navigate]);

  return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Iniciando sesión…</div>;
}
