import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const invoice = readFileSync(new URL('../src/components/InvoiceForm.tsx', import.meta.url), 'utf8');
const movement = readFileSync(new URL('../src/components/MovementForm.tsx', import.meta.url), 'utf8');
const invoices = readFileSync(new URL('../src/components/InvoicesList.tsx', import.meta.url), 'utf8');
const movements = readFileSync(new URL('../src/components/MovementsList.tsx', import.meta.url), 'utf8');
const csv = readFileSync(new URL('../src/components/CsvTransactionImporter.tsx', import.meta.url), 'utf8');
const empty = readFileSync(new URL('../src/components/OperationalEmptyState.tsx', import.meta.url), 'utf8');

test('los formularios muestran foco visible y etiquetas legibles', () => {
  assert.match(invoice, /focus:ring-2/);
  assert.match(movement, /focus:ring-2/);
  assert.match(invoice, /text-sm font-medium text-foreground/);
  assert.match(movement, /text-sm font-medium text-foreground/);
});

test('la carga PDF es accesible con teclado y comunica errores', () => {
  assert.match(invoice, /role="button"/);
  assert.match(invoice, /event\.key === 'Enter'/);
  assert.match(invoice, /event\.key === ' '/);
  assert.match(invoice, /aria-label="Subir factura en PDF/);
});

test('los estados vacíos llevan a una acción y los controles funcionan en móvil', () => {
  assert.match(empty, /min-h-11/);
  assert.match(invoices, /Registrar primera factura/);
  assert.match(movements, /Registrar primer movimiento/);
  assert.match(invoices, /size-11/);
  assert.match(movements, /size-11/);
  assert.match(invoices, /group-focus-within/);
  assert.match(movements, /group-focus-within/);
});

test('el importador guía mapeo, análisis, errores y confirmación', () => {
  for (const label of ['Fecha', 'Monto', 'Descripción', 'Tipo', 'Referencia']) assert.match(csv, new RegExp(label));
  assert.match(csv, /Relaciona las columnas/);
  assert.match(csv, /role="alert"/);
  assert.match(csv, /aria-live="polite"/);
  assert.match(csv, /min-h-11/);
});
