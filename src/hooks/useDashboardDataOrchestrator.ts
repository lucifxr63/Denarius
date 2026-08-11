import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  getDefaultTenant,
  listAccounts,
  listInvoices,
  listTransactions,
  listRecurringTransactions,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  createTransaction,
  deleteTransaction,
  type Invoice,
  type Transaction,
  type InvoiceType,
  type InvoiceStatus,
  type TxType,
  type SourceSystem,
} from '@/lib/queries';
import { useAuth } from '@/store/auth';
import { useDashboardData } from '@/store/useDashboardData';
import { reportError } from '@/lib/report-error';

// ════════════════════════════════════════════════════════════════════════════
// Hook Orquestador de Ruta (Épica #52, Hito 1). El PUENTE de red entre Supabase
// (RLS) y las acciones PURAS del store Zustand (useDashboardData).
// ════════════════════════════════════════════════════════════════════════════
// El store es network-agnostic; aquí vive TODO el side-effect (fetch/mutación/
// reintento). El orquestador NO se suscribe a los datos del store (usa getState)
// → no re-renderiza ante cambios de estado; solo gestiona su loading/error.
//
// ESTRATEGIA DE MUTACIÓN (híbrida por autoridad del dato):
//  • Colección editada por el usuario → optimista con tempId (UI instantánea).
//  • Saldos (triggers) y métricas fiscales (RPC) = autoritativos del servidor →
//    se RECONCILIAN vía re-fetch; jamás se adivinan optimistamente.
//  • En éxito Y en fallo se reconcilia → convergencia garantizada a la verdad del
//    servidor (el fallo además hace rollback al snap-back + toast).

const TMP_PREFIX = 'tmp_';

function nowIso(): string {
  return new Date().toISOString();
}

function buildOptimisticInvoice(
  input: { type: InvoiceType; total_amount: number; currency?: string; issue_date: string; due_date: string; contact_name?: string | null; source_system?: SourceSystem },
  tenantId: string,
  ownerId: string,
): Invoice {
  const ts = nowIso();
  return {
    id: `${TMP_PREFIX}${crypto.randomUUID()}`,
    tenant_id: tenantId,
    owner_id: ownerId,
    type: input.type,
    total_amount: input.total_amount,
    currency: input.currency ?? 'CLP',
    issue_date: input.issue_date,
    due_date: input.due_date,
    contact_name: input.contact_name ?? null,
    source_system: input.source_system ?? 'MANUAL',
    external_id: null,
    status: 'PENDING',
    created_at: ts,
    updated_at: ts,
  };
}

function buildOptimisticTransaction(
  input: { account_id: string; amount: number; type: TxType; category?: string | null; transaction_date?: string },
  ownerId: string,
): Transaction {
  const ts = nowIso();
  return {
    id: `${TMP_PREFIX}${crypto.randomUUID()}`,
    account_id: input.account_id,
    owner_id: ownerId,
    amount: input.amount,
    type: input.type,
    category: input.category ?? null,
    import_batch_id: null,
    import_fingerprint: null,
    source_reference: null,
    transaction_date: input.transaction_date ?? ts.slice(0, 10),
    created_at: ts,
    updated_at: ts,
  };
}

// ── Reconciliadores: traen la verdad del servidor a las colecciones afectadas ──
async function reconcileInvoices(tenantId:string): Promise<void> {
  useDashboardData.getState().hydrate({ invoices: await listInvoices(tenantId) });
}
// Una transacción dispara el trigger de saldo → re-fetch también de cuentas.
async function reconcileTransactions(tenantId:string): Promise<void> {
  const [transactions, accounts] = await Promise.all([listTransactions(tenantId), listAccounts(tenantId)]);
  useDashboardData.getState().hydrate({ transactions, accounts });
}

// Aplica optimista → ejecuta red → reconcilia (en éxito y en fallo).
async function mutate(
  optimistic: () => void,
  op: () => Promise<unknown>,
  reconcile: () => Promise<void>,
  errMsg: string,
): Promise<void> {
  optimistic();
  try {
    await op();
    await reconcile();
  } catch (err) {
    await reconcile().catch(() => {}); // snap-back a la verdad del servidor (rollback)
    reportError(err, { stage: 'orchestrator-mutate' });
    toast.error(errMsg);
    throw err;
  }
}

export interface DashboardOrchestrator {
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addInvoice: (input: { type: InvoiceType; total_amount: number; currency?: string; issue_date: string; due_date: string; contact_name?: string | null; source_system?: SourceSystem }) => Promise<void>;
  resolveInvoice: (id: string, patch: { status?: InvoiceStatus; due_date?: string }) => Promise<void>;
  removeInvoice: (id: string) => Promise<void>;
  addTransaction: (input: { account_id: string; amount: number; type: TxType; category?: string | null; transaction_date?: string }) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
}

export function useDashboardDataOrchestrator(): DashboardOrchestrator {
  const userId = useAuth((s) => s.user?.id ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hidratación inicial: resuelve tenant + carga colecciones → store.
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tenant = await getDefaultTenant();
      useDashboardData.getState().setTenant(tenant?.id ?? null);
      if (!tenant) {
        useDashboardData.getState().hydrate({ accounts: [], invoices: [], transactions: [], recurring: [] });
        setLoading(false);
        return;
      }
      const [accounts, invoices, transactions, recurring] = await Promise.all([
        listAccounts(tenant.id),
        listInvoices(tenant.id),
        listTransactions(tenant.id),
        listRecurringTransactions(tenant.id),
      ]);
      useDashboardData.getState().hydrate({ accounts, invoices, transactions, recurring });
      setLoading(false);
    } catch (err) {
      reportError(err, { stage: 'orchestrator-hydrate' });
      setError('No se pudieron cargar los datos.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) void refresh();
  }, [userId, refresh]);

  const addInvoice = useCallback<DashboardOrchestrator['addInvoice']>(async (input) => {
    const { tenantId } = useDashboardData.getState();
    if (!tenantId || !userId) throw new Error('Sin tenant/sesión');
    await mutate(
      () => useDashboardData.getState().upsertInvoice(buildOptimisticInvoice(input, tenantId, userId)),
      () => createInvoice({ ...input, tenant_id: tenantId }),
      () => reconcileInvoices(tenantId),
      'No se pudo registrar la factura',
    );
  }, [userId]);

  const resolveInvoice = useCallback<DashboardOrchestrator['resolveInvoice']>(async (id, patch) => {
    const { tenantId } = useDashboardData.getState();
    if (!tenantId) throw new Error('Sin empresa activa');
    const current = useDashboardData.getState().invoices.find((i) => i.id === id);
    await mutate(
      () => { if (current) useDashboardData.getState().upsertInvoice({ ...current, ...patch }); },
      () => updateInvoice(id, patch),
      () => reconcileInvoices(tenantId),
      'No se pudo actualizar la factura',
    );
  }, []);

  const removeInvoice = useCallback<DashboardOrchestrator['removeInvoice']>(async (id) => {
    const { tenantId } = useDashboardData.getState();
    if (!tenantId) throw new Error('Sin empresa activa');
    await mutate(
      () => useDashboardData.getState().removeInvoice(id),
      () => deleteInvoice(id),
      () => reconcileInvoices(tenantId),
      'No se pudo eliminar la factura',
    );
  }, []);

  const addTransaction = useCallback<DashboardOrchestrator['addTransaction']>(async (input) => {
    const { tenantId } = useDashboardData.getState();
    if (!tenantId) throw new Error('Sin empresa activa');
    if (!userId) throw new Error('Sin sesión');
    await mutate(
      () => useDashboardData.getState().upsertTransaction(buildOptimisticTransaction(input, userId)),
      () => createTransaction({ ...input, owner_id: userId }),
      () => reconcileTransactions(tenantId),
      'No se pudo registrar el movimiento',
    );
  }, [userId]);

  const removeTransaction = useCallback<DashboardOrchestrator['removeTransaction']>(async (id) => {
    const { tenantId } = useDashboardData.getState();
    if (!tenantId) throw new Error('Sin empresa activa');
    await mutate(
      () => useDashboardData.getState().removeTransaction(id),
      () => deleteTransaction(id),
      () => reconcileTransactions(tenantId),
      'No se pudo eliminar el movimiento',
    );
  }, []);

  return { loading, error, refresh, addInvoice, resolveInvoice, removeInvoice, addTransaction, removeTransaction };
}
