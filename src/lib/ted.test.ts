import { describe, it, expect } from 'vitest';
import { parseTED } from './ted';

// TED REAL extraído del "Manual de Muestras Impresas" oficial del SII
// (sii.cl/factura_electronica/manual_muestras_impresas.pdf, pág. 14) — un timbre
// firmado con RSA/SHA1 genuino, marcado por el SII como "RUT DE PRUEBA".
const REAL_SII_TED =
  '<TED version="1.0"><DD><RE>44300251-0</RE><TD>33</TD><F>375</F><FE>2010-11-10</FE>' +
  '<RR>1-9</RR><RSR>EDUARDO HONZALEZ MENDEZ</RSR><MNT>2890260</MNT><IT1>prueba</IT1>' +
  '<CAF version="1.0"><DA><RE>44300251-0</RE><RS>RUT DE PRUEBA FACTURA ELECTRONICA DR7</RS>' +
  '<TD>33</TD><RNG><D>375</D><H>375</H></RNG><FA>2010-11-10</FA>' +
  '<RSAPK><M>qMZP0GA7rdYDj4e4hnu+fuhc0sW9XFQq08/sYDvJJk+ypx0xH6lcFu4WzMoyuoxS77Rwq+YJmX1QM7Fh92XFBQ==</M><E>Aw==</E></RSAPK>' +
  '<IDK>300</IDK></DA><FRMA algoritmo="SHA1withRSA">TWqPHh1qh6dxUhURI0Svd6NVBS5kS+83IAlMC3++YIYmWmlo6dU2OFaYC51COMAw9Ll1QqKolq7dQBc+/jAn3A==</FRMA></CAF>' +
  '<TSTED>2010-11-10T11:29:48</TSTED></DD>' +
  '<FRMT algoritmo="SHA1withRSA">iTGj44T3dBOHJwGAcCv9oIEde+HOywsgUMBgjexMRsv8xQXxe71fEPHqYeJ+QnpigR+vY14YHpPgKyHSDyGNOQ==</FRMT></TED>';

describe('parseTED — timbre real del SII (manual de muestras)', () => {
  const ted = parseTED(REAL_SII_TED);

  it('parsea el timbre real completo', () => {
    expect(ted).not.toBeNull();
  });
  it('extrae RUT emisor', () => expect(ted?.rutEmisor).toBe('44300251-0'));
  it('mapea el tipo DTE 33 a Factura Electrónica', () => {
    expect(ted?.tipoDte).toBe(33);
    expect(ted?.tipoDteLabel).toBe('Factura Electrónica');
  });
  it('extrae folio, fecha y monto', () => {
    expect(ted?.folio).toBe('375');
    expect(ted?.fechaEmision).toBe('2010-11-10');
    expect(ted?.montoTotal).toBe(2890260);
  });
  it('extrae receptor (RR/RSR)', () => {
    expect(ted?.rutReceptor).toBe('1-9');
    expect(ted?.razonSocialReceptor).toBe('EDUARDO HONZALEZ MENDEZ');
  });
  it('extrae el primer ítem', () => expect(ted?.primerItem).toBe('prueba'));
  it('usa AR como dirección por defecto (§D2)', () => expect(ted?.invoiceType).toBe('AR'));
});

describe('parseTED — mapeo de tipos DTE', () => {
  const withTD = (td: number) =>
    parseTED(`<TED version="1.0"><DD><RE>1-9</RE><TD>${td}</TD><F>1</F><FE>2024-01-01</FE><MNT>1000</MNT></DD></TED>`);

  it('39 → Boleta Electrónica', () => expect(withTD(39)?.tipoDteLabel).toBe('Boleta Electrónica'));
  it('41 → Boleta Exenta Electrónica', () => expect(withTD(41)?.tipoDteLabel).toBe('Boleta Exenta Electrónica'));
  it('34 → Factura Exenta Electrónica', () => expect(withTD(34)?.tipoDteLabel).toBe('Factura Exenta Electrónica'));
  it('61 → Nota de Crédito', () => expect(withTD(61)?.tipoDteLabel).toBe('Nota de Crédito'));
  it('52 → Guía de Despacho', () => expect(withTD(52)?.tipoDteLabel).toBe('Guía de Despacho'));
  it('código desconocido → etiqueta genérica', () => expect(withTD(999)?.tipoDteLabel).toBe('DTE tipo 999'));
});

describe('parseTED — campos opcionales', () => {
  it('boleta sin receptor ni ítem devuelve null en esos campos', () => {
    const ted = parseTED('<TED version="1.0"><DD><RE>77111222-3</RE><TD>39</TD><F>10045</F><FE>2024-12-01</FE><MNT>15990</MNT></DD></TED>');
    expect(ted?.rutReceptor).toBeNull();
    expect(ted?.razonSocialReceptor).toBeNull();
    expect(ted?.primerItem).toBeNull();
    expect(ted?.montoTotal).toBe(15990);
  });
});

describe('parseTED — entradas inválidas devuelven null (fallback a IA)', () => {
  it('texto sin timbre', () => expect(parseTED('cualquier cosa sin TED')).toBeNull());
  it('cadena vacía', () => expect(parseTED('')).toBeNull());
  it('TED sin monto (campo mínimo faltante)', () =>
    expect(parseTED('<TED><DD><RE>1-9</RE><TD>33</TD><F>1</F><FE>2024-01-01</FE></DD></TED>')).toBeNull());
  it('TED sin RUT emisor', () =>
    expect(parseTED('<TED><DD><TD>33</TD><F>1</F><FE>2024-01-01</FE><MNT>100</MNT></DD></TED>')).toBeNull());
  it('fecha con formato inválido (dd/mm/yyyy)', () =>
    expect(parseTED('<TED><DD><RE>1-9</RE><TD>33</TD><F>1</F><FE>14/04/2024</FE><MNT>100</MNT></DD></TED>')).toBeNull());
  it('monto no numérico', () =>
    expect(parseTED('<TED><DD><RE>1-9</RE><TD>33</TD><F>1</F><FE>2024-01-01</FE><MNT>abc</MNT></DD></TED>')).toBeNull());
});
