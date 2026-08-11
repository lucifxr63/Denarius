import { useEffect, useState } from 'react';
import { Building2, LoaderCircle } from 'lucide-react';
import { getDefaultTenant, listDenariusTenants, setActiveDenariusTenant, type Tenant } from '@/lib/queries';
import { toast } from 'sonner';

export function CompanySwitcher(){
  const [companies,setCompanies]=useState<Tenant[]>([]),[active,setActive]=useState<string>(''),[saving,setSaving]=useState(false);
  useEffect(()=>{void Promise.all([listDenariusTenants(),getDefaultTenant()]).then(([items,current])=>{setCompanies(items);setActive(current?.id??'')}).catch(()=>{})},[]);
  if(companies.length<2)return null;
  return <label className="relative inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium focus-within:ring-2 focus-within:ring-primary/60">
    {saving?<LoaderCircle className="size-4 animate-spin text-primary" aria-hidden="true"/>:<Building2 className="size-4 text-primary" aria-hidden="true"/>}
    <span className="sr-only">Empresa activa</span>
    <select aria-label="Empresa activa" disabled={saving} value={active} onChange={async e=>{const id=e.target.value;if(id===active)return;setSaving(true);try{await setActiveDenariusTenant(id);setActive(id);window.location.assign('/dashboard')}catch(error){toast.error(error instanceof Error?error.message:'No se pudo cambiar de empresa.');setSaving(false)}}} className="min-h-11 max-w-44 cursor-pointer appearance-none bg-transparent pr-4 outline-none disabled:cursor-wait">
      {companies.map(company=><option key={company.id} value={company.id}>{company.name}</option>)}
    </select>
  </label>;
}
