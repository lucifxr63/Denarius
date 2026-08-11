import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path: string) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('delegated writes derive the owner and require narrow permissions', () => {
  const sql = read('supabase/migrations/20260810250000_den128_delegated_operations.sql');
  assert.match(sql, /financial\.write/);
  assert.match(sql, /operations\.write/);
  assert.match(sql, /denarius_create_transaction/);
  assert.match(sql, /denarius_create_invoice/);
  assert.match(sql, /denarius_update_invoice/);
  assert.match(sql, /denarius_create_recurring/);
  assert.match(sql, /select owner_id into v_owner/);
  assert.doesNotMatch(sql, /delete from cashflow/i);
});

test('cashflow mutations use delegated RPCs instead of direct inserts', () => {
  const source = read('src/hooks/useCashflow.ts');
  const queries = read('src/lib/queries.ts');
  assert.match(source, /createDelegatedInvoice/);
  assert.match(source, /createDelegatedRecurring/);
  assert.match(queries, /rpc\('denarius_create_transaction'/);
  assert.match(queries, /rpc\('denarius_update_invoice'/);
});

test('dashboard exposes role-aware controls and protects deletes', () => {
  const dashboard = read('src/pages/Dashboard.tsx');
  assert.match(dashboard, /canOperate/);
  assert.match(dashboard, /canManage/);
  assert.match(dashboard, /Vista protegida por rol/);
  assert.match(read('src/components/InvoicesList.tsx'), /canDelete/);
  assert.match(read('src/components/MovementsList.tsx'), /canDelete/);
});
