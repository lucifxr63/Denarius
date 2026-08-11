import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

const demo = JSON.parse(fs.readFileSync(new URL('../fixtures/demo-company.json', import.meta.url), 'utf8'));

describe('dataset demo reproducible', () => {
  it('usa identificadores únicos y referencias de cuenta válidas', () => {
    const records = [demo.tenant, ...demo.accounts, ...demo.transactions, ...demo.invoices, ...demo.recurring];
    const ids = records.map((record) => record.id);
    assert.equal(new Set(ids).size, ids.length);

    const accountIds = new Set(demo.accounts.map((account) => account.id));
    assert.ok(demo.transactions.every((transaction) => accountIds.has(transaction.account_id)));
  });

  it('mantiene los totales esperados del escenario', () => {
    const receivables = demo.invoices
      .filter((invoice) => invoice.type === 'AR' && invoice.status === 'PENDING')
      .reduce((sum, invoice) => sum + invoice.total_amount, 0);
    const payables = demo.invoices
      .filter((invoice) => invoice.type === 'AP' && invoice.status === 'PENDING')
      .reduce((sum, invoice) => sum + invoice.total_amount, 0);

    assert.equal(receivables, demo.expected.pending_receivables);
    assert.equal(payables, demo.expected.pending_payables);
    assert.equal(demo.accounts.reduce((sum, account) => sum + account.current_balance, 0), demo.expected.current_cash);
  });

  it('no contiene correos, teléfonos ni identificadores tributarios', () => {
    const serialized = JSON.stringify(demo);
    assert.doesNotMatch(serialized, /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
    assert.doesNotMatch(serialized, /\b\d{1,2}\.\d{3}\.\d{3}-[\dkK]\b/);
  });
});
