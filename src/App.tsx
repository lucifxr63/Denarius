import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/store/theme';
import { ConfirmProvider } from '@/components/ui/confirm';
import { RequireAuth } from '@/components/RequireAuth';
import { BusinessModelGate } from '@/components/onboarding/BusinessModelGate';
import { ProductPageShell } from '@/components/layout/ProductPageShell';
import { FinancialControlFlow } from '@/components/layout/FinancialControlFlow';

const Landing = lazy(() => import('@/pages/Landing').then((module) => ({ default: module.Landing })));
const Login = lazy(() => import('@/pages/Login').then((module) => ({ default: module.Login })));
const Dashboard = lazy(() => import('@/pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const SaasCashflow = lazy(() => import('@/pages/SaasCashflow').then((module) => ({ default: module.SaasCashflow })));
const Workspace = lazy(() => import('@/pages/Workspace').then((module) => ({ default: module.Workspace })));
const SaasSubscriptions = lazy(() => import('@/pages/SaasSubscriptions').then((module) => ({ default: module.SaasSubscriptions })));
const AuthCallback = lazy(() => import('@/components/AuthCallback').then((module) => ({ default: module.AuthCallback })));
const OAuthConsent = lazy(() => import('@/pages/OAuthConsent').then((module) => ({ default: module.OAuthConsent })));
const McpConnections = lazy(() => import('@/pages/McpConnections').then((module) => ({ default: module.McpConnections })));
const FinancialAlerts = lazy(() => import('@/pages/FinancialAlerts').then((module) => ({ default: module.FinancialAlerts })));
const WeeklyClose = lazy(() => import('@/pages/WeeklyClose').then((module) => ({ default: module.WeeklyClose })));
const BetaSupport = lazy(() => import('@/pages/BetaSupport').then((module) => ({ default: module.BetaSupport })));
const DataQuality = lazy(() => import('@/pages/DataQuality').then((module) => ({ default: module.DataQuality })));
const Legal = lazy(() => import('@/pages/Legal').then((module) => ({ default: module.Legal })));
const Account = lazy(() => import('@/pages/Account').then((module) => ({ default: module.Account })));
const ActionPlan = lazy(() => import('@/pages/ActionPlan').then((module) => ({ default: module.ActionPlan })));
const AdminDemo = lazy(() => import('@/pages/AdminDemo').then((module) => ({ default: module.AdminDemo })));
const LearningCenter = lazy(() => import('@/pages/LearningCenter').then((module) => ({ default: module.LearningCenter })));
const DemoAccess = lazy(() => import('@/pages/DemoAccess').then((module) => ({ default: module.DemoAccess })));
const TeamAccess = lazy(() => import('@/pages/TeamAccess').then((module) => ({ default: module.TeamAccess })));
const JoinTeam = lazy(() => import('@/pages/JoinTeam').then((module) => ({ default: module.JoinTeam })));
const BetaExperience = lazy(() => import('@/pages/BetaExperience').then((module) => ({ default: module.BetaExperience })));

function RouteFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground" role="status">
      Cargando Denarius…
    </div>
  );
}

export default function App() {
  // Inicializa la sesión y la suscripción a cambios de auth una sola vez.
  useEffect(() => useAuth.getState().init(), []);
  // Sigue cambios del esquema del sistema cuando el tema es "system".
  useEffect(() => useTheme.getState().init(), []);
  const resolvedTheme = useTheme((s) => s.resolved);

  return (
    <ConfirmProvider>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/terms" element={<Legal kind="terms" />} />
          <Route path="/privacy" element={<Legal kind="privacy" />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/oauth/consent" element={<OAuthConsent />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <BusinessModelGate><Workspace /></BusinessModelGate>
              </RequireAuth>
            }
          />
          <Route
            path="/operations"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/saas"
            element={
              <RequireAuth>
                <SaasCashflow />
              </RequireAuth>
            }
          />
          <Route
            path="/subscriptions"
            element={
              <RequireAuth>
                <ProductPageShell><SaasSubscriptions /></ProductPageShell>
              </RequireAuth>
            }
          />
          <Route
            path="/data-quality"
            element={<RequireAuth><BusinessModelGate><ProductPageShell><DataQuality /></ProductPageShell></BusinessModelGate></RequireAuth>}
          />
          <Route
            path="/support"
            element={<RequireAuth><ProductPageShell><BetaSupport /></ProductPageShell></RequireAuth>}
          />
          <Route
            path="/weekly-close"
            element={<RequireAuth><BusinessModelGate><ProductPageShell context={<FinancialControlFlow current="close" />}><WeeklyClose /></ProductPageShell></BusinessModelGate></RequireAuth>}
          />
          <Route
            path="/alerts"
            element={<RequireAuth><BusinessModelGate><ProductPageShell context={<FinancialControlFlow current="alerts" />}><FinancialAlerts /></ProductPageShell></BusinessModelGate></RequireAuth>}
          />
          <Route
            path="/account"
            element={<RequireAuth><ProductPageShell><Account /></ProductPageShell></RequireAuth>}
          />
          <Route
            path="/admin/demo"
            element={<RequireAuth><ProductPageShell><AdminDemo /></ProductPageShell></RequireAuth>}
          />
          <Route path="/learn" element={<RequireAuth><ProductPageShell><LearningCenter /></ProductPageShell></RequireAuth>} />
          <Route path="/demo/:model" element={<RequireAuth><ProductPageShell><DemoAccess /></ProductPageShell></RequireAuth>} />
          <Route path="/team" element={<RequireAuth><ProductPageShell><TeamAccess /></ProductPageShell></RequireAuth>} />
          <Route path="/join" element={<RequireAuth><ProductPageShell><JoinTeam /></ProductPageShell></RequireAuth>} />
          <Route path="/admin/experience" element={<RequireAuth><ProductPageShell><BetaExperience /></ProductPageShell></RequireAuth>} />
          <Route
            path="/action-plan"
            element={<RequireAuth><BusinessModelGate><ProductPageShell><ActionPlan /></ProductPageShell></BusinessModelGate></RequireAuth>}
          />
          <Route
            path="/connections"
            element={
              <RequireAuth>
                <ProductPageShell><McpConnections /></ProductPageShell>
              </RequireAuth>
            }
          />
          <Route
            path="/workspace"
            element={<Navigate to="/dashboard" replace />}
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
      <Toaster richColors position="top-right" theme={resolvedTheme} />
    </ConfirmProvider>
  );
}
