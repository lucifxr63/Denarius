import { useEffect, useState, type ReactNode } from 'react';
import { BusinessModelDiagnostic } from './BusinessModelDiagnostic';
import { FinancialBaselineSetup } from './FinancialBaselineSetup';
import { CompanyContextSetup } from './CompanyContextSetup';
import { completeFinancialOnboarding, getDefaultTenant, listAccounts, saveBusinessModelProfile, saveCompanyContext, type Tenant } from '@/lib/queries';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import type { BusinessModel, DiagnosticAnswers } from '@/lib/business-model-diagnostic';

export function BusinessModelGate({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null | undefined>(undefined);
  const [hasAccount, setHasAccount] = useState<boolean | undefined>(undefined);
  const setModel = useWorkspaceStore((state) => state.setModel);

  useEffect(() => {
    getDefaultTenant().then(async current => ({ current, accounts: current ? await listAccounts(current.id) : [] })).then(({current, accounts}) => {
      setTenant(current); setHasAccount(accounts.length > 0);
      if (current?.business_model === 'startup-saas' || current?.business_model === 'pyme-tradicional') setModel(current.business_model);
    }).catch(() => { setTenant(null); setHasAccount(false); });
  }, [setModel]);

  if (tenant === undefined || hasAccount === undefined) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Preparando tu espacio financiero…</div>;
  if (!tenant) return <>{children}</>;

  const confirm = async (model: BusinessModel, answers: DiagnosticAnswers) => {
    const updated = await saveBusinessModelProfile({ tenantId: tenant.id, model, source: 'diagnostic', answers });
    setModel(model); setTenant(updated);
  };
  if (!tenant.company_context_completed_at) return <CompanyContextSetup onComplete={async values=>setTenant(await saveCompanyContext({tenantId:tenant.id,...values}))}/>;
  if (!tenant.business_model_diagnosed_at) return <BusinessModelDiagnostic companyName={tenant.name} onConfirm={confirm} />;
  if (!hasAccount) return <FinancialBaselineSetup companyName={tenant.name} model={tenant.business_model as BusinessModel} onComplete={async (values) => { await completeFinancialOnboarding({ tenantId: tenant.id, ...values }); setHasAccount(true); }} />;
  return <>{children}</>;
}
