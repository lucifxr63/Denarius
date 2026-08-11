import { useMemo, useState } from 'react';
import { FileSpreadsheet, LoaderCircle, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { BankAccount } from '@/lib/queries';
import { importTransactionsCsv, previewTransactionImport, type ImportPreview } from '@/lib/queries';
import { mapCsvRows, parseCsv, suggestMapping, type CsvMapping, type ImportRow, type ParsedCsv } from '@/lib/csv-import';

const FIELD_LABELS: Record<keyof CsvMapping, string> = {
  date: 'Fecha', amount: 'Monto', description: 'Descripción', type: 'Tipo', reference: 'Referencia',
};
const control = 'mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20';

export function CsvTransactionImporter({ accounts, onImported }: { accounts: BankAccount[]; onImported: () => Promise<void> }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<Partial<CsvMapping>>({});
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [preview, setPreview] = useState<ImportPreview[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const duplicates = useMemo(() => new Set(preview.filter((item) => item.duplicate).map((item) => item.row)), [preview]);

  const load = async (file: File) => {
    if (file.size > 2_000_000) return toast.error('El CSV supera 2 MB. Divide el archivo antes de continuar.');
    const next = parseCsv(await file.text());
    setParsed(next); setMapping(suggestMapping(next.headers)); setFileName(file.name); setRows([]); setPreview([]); setErrors([]);
  };
  const analyze = async () => {
    if (!parsed || !accountId || !mapping.date || !mapping.amount) return;
    const result = mapCsvRows(parsed.records, mapping as CsvMapping);
    setErrors(result.errors.map((error) => `Fila ${error.row}: ${error.message}`));
    setRows(result.valid);
    if (!result.valid.length) return setPreview([]);
    setBusy(true);
    try { setPreview(await previewTransactionImport(accountId, result.valid)); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'No fue posible analizar el archivo'); }
    finally { setBusy(false); }
  };
  const confirm = async () => {
    if (!rows.length) return;
    setBusy(true);
    try {
      const result = await importTransactionsCsv(accountId, fileName, rows);
      toast.success(`${result.inserted} movimientos importados · ${result.duplicates} duplicados omitidos`);
      await onImported(); setParsed(null); setRows([]); setPreview([]); setFileName('');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'No fue posible importar'); }
    finally { setBusy(false); }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><FileSpreadsheet className="size-5" aria-hidden="true" /></span><div><h3 className="font-display text-lg font-semibold">Importar movimientos CSV</h3><p className="text-sm text-muted-foreground">Previsualiza y concilia antes de modificar la caja. Máximo 500 filas y 2 MB.</p></div></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Cuenta<select className={control} value={accountId} onChange={(event) => setAccountId(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
        <label className="text-sm font-medium">Archivo CSV<input className={`${control} cursor-pointer py-2`} type="file" accept=".csv,text/csv" onChange={(event) => event.target.files?.[0] && void load(event.target.files[0])} /></label>
      </div>
      {parsed && <><div className="mt-5"><h4 className="text-sm font-semibold">Relaciona las columnas</h4><p className="text-xs text-muted-foreground">Fecha y Monto son obligatorios. Revisa las sugerencias antes de analizar.</p></div><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{(['date', 'amount', 'description', 'type', 'reference'] as const).map((field) => <label key={field} className="text-sm font-medium">{FIELD_LABELS[field]}<select className={control} value={mapping[field] ?? ''} onChange={(event) => setMapping((current) => ({ ...current, [field]: event.target.value || undefined }))}><option value="">Sin asignar</option>{parsed.headers.map((header) => <option key={header}>{header}</option>)}</select></label>)}</div><button disabled={busy || !mapping.date || !mapping.amount} onClick={() => void analyze()} className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50">{busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}Analizar archivo</button></>}
      {rows.length > 0 && <div className="mt-5"><div className="flex flex-wrap gap-3 text-sm" aria-live="polite"><span>{rows.length} válidas</span><span className="text-amber">{duplicates.size} ya existentes</span><span className="text-danger">{errors.length} con error</span></div><div className="mt-2 max-h-56 overflow-auto rounded-md border border-border"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-muted"><tr><th className="p-2">Fecha</th><th className="p-2">Tipo</th><th className="p-2">Monto</th><th className="p-2">Descripción</th><th className="p-2">Estado</th></tr></thead><tbody>{rows.slice(0, 50).map((row, index) => <tr key={`${row.date}-${index}`} className="border-t border-border"><td className="p-2">{row.date}</td><td className="p-2">{row.type}</td><td className="p-2">{row.amount.toLocaleString('es-CL')}</td><td className="p-2">{row.description || '—'}</td><td className="p-2">{duplicates.has(index + 1) ? 'Duplicado' : 'Nuevo'}</td></tr>)}</tbody></table></div><button disabled={busy || rows.length === duplicates.size} onClick={() => void confirm()} className="mt-3 min-h-11 cursor-pointer rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Importando…' : 'Confirmar importación'}</button></div>}
      {errors.length > 0 && <div role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger/5 p-3"><p className="text-sm font-semibold text-danger">Corrige estas filas antes de importar</p><ul className="mt-1 text-xs text-danger">{errors.slice(0, 5).map((error) => <li key={error}>{error}</li>)}</ul>{errors.length > 5 && <p className="mt-1 text-xs text-muted-foreground">Se muestran 5 de {errors.length} errores.</p>}</div>}
    </section>
  );
}
