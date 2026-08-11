import type { ReactNode } from 'react';
import { ProductHeader } from '@/components/layout/ProductHeader';

/**
 * Adapta páginas secundarias existentes al shell de producto sin alterar su
 * lógica de datos. Sus cabeceras locales quedan ocultas mientras se completa
 * la migración estructural de cada pantalla.
 */
export function ProductPageShell({ children, context }: { children: ReactNode; context?: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <ProductHeader />
      {context}
      <div className="[&>div>header:first-child]:hidden">{children}</div>
    </div>
  );
}
