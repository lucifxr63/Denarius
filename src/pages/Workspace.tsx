import { ProductHeader } from '@/components/layout/ProductHeader';
import { DashboardCanvas } from '@/components/dashboard/DashboardCanvas';

// Página host del motor de Dashboards Financieros Dinámicos. El header lleva el
// Workspace Switcher (cambio de modelo sin modales) y el cuerpo es el lienzo
// config-driven que reacciona al modelo activo.
export function Workspace() {
  return (
    <div className="min-h-screen">
      <ProductHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <DashboardCanvas />
      </main>
    </div>
  );
}
