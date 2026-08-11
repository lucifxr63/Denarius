import { supabase } from './supabase';
import type { FinancialToolRequest, ToolEnvelope } from './financial-tools';

export async function invokeFinancialTool(request: FinancialToolRequest): Promise<ToolEnvelope<unknown>> {
  const { data, error } = await supabase.functions.invoke<ToolEnvelope<unknown>>('denarius-tools', {
    body: request,
  });
  if (error) throw new Error('No pudimos consultar los datos financieros. Intenta nuevamente.');
  if (!data) throw new Error('La herramienta no devolvio informacion.');
  return data;
}
