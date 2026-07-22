import { describe, it, expect } from 'vitest';
import {
  buildLicitacionesUrl,
  buildCompraAgilUrl,
  compraAgilHeaders,
  toChileCompraDate,
  parseLicitaciones,
  filterByKeywords,
  matchesKeywords,
  portalUrl,
  ChileCompraError,
  type Opportunity,
} from './chilecompra';

describe('buildLicitacionesUrl', () => {
  it('inyecta el ticket en la query string', () => {
    const url = buildLicitacionesUrl('ABC-123');
    expect(url).toContain('ticket=ABC-123');
    expect(url).toContain('api.mercadopublico.cl');
  });
  it('agrega estado y fecha cuando se pasan', () => {
    const url = buildLicitacionesUrl('T', { estado: 'activas', fecha: '22072026' });
    expect(url).toContain('estado=activas');
    expect(url).toContain('fecha=22072026');
  });
  it('permite consultar por código específico', () => {
    const url = buildLicitacionesUrl('T', { codigo: '1509-54-L124' });
    expect(url).toContain('codigo=1509-54-L124');
  });
});

describe('Compra Ágil (api2, ticket en header)', () => {
  it('el ticket va en el header, no en la URL', () => {
    const url = buildCompraAgilUrl();
    const headers = compraAgilHeaders('XYZ');
    expect(url).toContain('api2.mercadopublico.cl');
    expect(url).not.toContain('XYZ');
    expect(headers.ticket).toBe('XYZ');
  });
});

describe('toChileCompraDate', () => {
  it('formatea a ddmmaaaa con ceros a la izquierda', () => {
    expect(toChileCompraDate(new Date('2026-07-05T00:00:00'))).toBe('05072026');
    expect(toChileCompraDate(new Date('2026-12-22T00:00:00'))).toBe('22122026');
  });
});

describe('parseLicitaciones', () => {
  const sample = {
    Cantidad: 2,
    Version: 'v1',
    Listado: [
      {
        CodigoExterno: '1509-54-L124',
        Nombre: 'SERVICIO DE DESARROLLO DE SOFTWARE',
        FechaCierre: '2026-08-01T15:00:00',
        MontoEstimado: 5000000,
        Comprador: { NombreOrganismo: 'MUNICIPALIDAD DE TEMUCO' },
      },
      { CodigoExterno: '2020-1-LP26', Nombre: 'Suministro de panadería' },
    ],
  };

  it('mapea los campos al modelo normalizado', () => {
    const [a] = parseLicitaciones(sample);
    expect(a.source).toBe('licitacion');
    expect(a.code).toBe('1509-54-L124');
    expect(a.name).toBe('SERVICIO DE DESARROLLO DE SOFTWARE');
    expect(a.organism).toBe('MUNICIPALIDAD DE TEMUCO');
    expect(a.estimatedAmount).toBe(5000000);
    expect(a.closingDate).toBe('2026-08-01'); // normalizada a YYYY-MM-DD
    expect(a.url).toContain('1509-54-L124');
  });

  it('tolera campos ausentes (organism/monto/fecha → null)', () => {
    const [, b] = parseLicitaciones(sample);
    expect(b.organism).toBeNull();
    expect(b.estimatedAmount).toBeNull();
    expect(b.closingDate).toBeNull();
  });

  it('lanza ChileCompraError ante la respuesta de error del API', () => {
    // Forma REAL capturada del API en rate limit.
    const err = { Codigo: 10500, Mensaje: 'Lo sentimos. Hemos detectado que existen peticiones simultáneas.' };
    expect(() => parseLicitaciones(err)).toThrowError(ChileCompraError);
    try {
      parseLicitaciones(err);
    } catch (e) {
      expect((e as ChileCompraError).code).toBe(10500);
    }
  });

  it('entradas vacías o no-objeto devuelven []', () => {
    expect(parseLicitaciones(null)).toEqual([]);
    expect(parseLicitaciones({})).toEqual([]);
    expect(parseLicitaciones({ Listado: [] })).toEqual([]);
  });

  it('descarta items sin CodigoExterno', () => {
    const r = parseLicitaciones({ Listado: [{ Nombre: 'sin código' }, { CodigoExterno: 'X-1', Nombre: 'ok' }] });
    expect(r).toHaveLength(1);
    expect(r[0].code).toBe('X-1');
  });
});

describe('matchesKeywords / filterByKeywords', () => {
  const items: Opportunity[] = [
    { source: 'licitacion', code: 'A', name: 'Servicio de SOFTWARE contable', organism: null, estimatedAmount: null, closingDate: null, url: '' },
    { source: 'licitacion', code: 'B', name: 'Suministro de pan y productos de panadería', organism: null, estimatedAmount: null, closingDate: null, url: '' },
    { source: 'licitacion', code: 'C', name: 'Construcción de veredas', organism: null, estimatedAmount: null, closingDate: null, url: '' },
  ];

  it('sin keywords, pasa todo', () => {
    expect(filterByKeywords(items, [])).toHaveLength(3);
    expect(filterByKeywords(items, ['  '])).toHaveLength(3);
  });
  it('filtra por coincidencia de substring (case-insensitive)', () => {
    expect(filterByKeywords(items, ['software']).map((i) => i.code)).toEqual(['A']);
  });
  it('ignora acentos (panadería ~ panaderia)', () => {
    expect(matchesKeywords('Suministro de panadería', ['panaderia'])).toBe(true);
    expect(filterByKeywords(items, ['panaderia']).map((i) => i.code)).toEqual(['B']);
  });
  it('acepta múltiples keywords (OR)', () => {
    expect(filterByKeywords(items, ['software', 'veredas']).map((i) => i.code)).toEqual(['A', 'C']);
  });
});

describe('portalUrl', () => {
  it('construye un enlace con el código', () => {
    expect(portalUrl('1509-54-L124')).toContain('1509-54-L124');
    expect(portalUrl('1509-54-L124')).toContain('mercadopublico.cl');
  });
});
