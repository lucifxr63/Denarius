export type CsvMapping = { date: string; amount: string; description?: string; type?: string; reference?: string }
export type ImportRow = { date: string; amount: number; type: 'IN' | 'OUT'; description: string; reference: string }
export type ParsedCsv = { headers: string[]; records: Record<string, string>[] }

export function parseCsv(source: string): ParsedCsv {
  const delimiter = (source.split(/\r?\n/, 1)[0].match(/;/g)?.length ?? 0) > (source.split(/\r?\n/, 1)[0].match(/,/g)?.length ?? 0) ? ';' : ','
  const rows: string[][] = []; let row: string[]=[]; let cell=''; let quoted=false
  for(let i=0;i<source.length;i++){const char=source[i];if(char==='"'){if(quoted&&source[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(char===delimiter&&!quoted){row.push(cell.trim());cell=''}else if((char==='\n'||char==='\r')&&!quoted){if(char==='\r'&&source[i+1]==='\n')i++;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell=''}else cell+=char}
  row.push(cell.trim()); if(row.some(Boolean))rows.push(row)
  const headers=(rows.shift()??[]).map(value=>value.trim())
  return {headers,records:rows.map(values=>Object.fromEntries(headers.map((header,index)=>[header,values[index]??''])))}
}

const aliases: Record<keyof CsvMapping,string[]>={date:['fecha','date','transaction_date'],amount:['monto','amount','importe','valor'],description:['descripcion','descripción','description','detalle','glosa'],type:['tipo','type','sentido'],reference:['referencia','reference','id','folio']}
export function suggestMapping(headers:string[]):Partial<CsvMapping>{const normalized=new Map(headers.map(h=>[h.toLowerCase().trim(),h]));return Object.fromEntries(Object.entries(aliases).map(([field,names])=>[field,names.map(n=>normalized.get(n)).find(Boolean)]).filter(([,value])=>value))}

export function mapCsvRows(records:Record<string,string>[],mapping:CsvMapping):{valid:ImportRow[];errors:{row:number;message:string}[]}{
  const valid:ImportRow[]=[];const errors:{row:number;message:string}[]=[]
  records.forEach((record,index)=>{const rawAmount=(record[mapping.amount]??'').replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');const signed=Number(rawAmount);const date=record[mapping.date]??'';const parsedDate=new Date(`${date}T00:00:00Z`);const validDate=/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(parsedDate.valueOf())&&parsedDate.toISOString().slice(0,10)===date;const explicit=(mapping.type?record[mapping.type]:'').toUpperCase();const type: 'IN'|'OUT'=explicit==='OUT'||explicit==='EGRESO'||signed<0?'OUT':'IN';if(!validDate||!Number.isFinite(signed)||signed===0){errors.push({row:index+2,message:'Fecha (AAAA-MM-DD) o monto inválido'});return}valid.push({date,amount:Math.abs(signed),type,description:mapping.description?record[mapping.description]??'':'',reference:mapping.reference?record[mapping.reference]??'':''})})
  return {valid,errors}
}
