import { describe, it, expect } from 'vitest';
import { sanitizeResource, cleanTags, sameContent } from './model.js';
import { queryResources, matchesQuery, collectCategories, collectTags, EMPTY_FILTERS } from './search.js';
import { parseUrlInput, guessType, titleFromUrl, urlKey } from './url.js';
import { parseBackup, planImport, buildBackup, BackupError, describeImportResult } from './backup.js';
import { countByStatus, oldestPending, usefulOnes, randomSelection } from './review.js';
import { parseHash } from './route.js';

const r = (over) =>
  sanitizeResource({
    id: over.id ?? over.title,
    createdAt: '2026-10-01T10:00:00.000Z',
    ...over,
  });

const sample = [
  r({ id: 'a', title: 'Reglamento de IA de la UE', type: 'documento', category: 'Derecho digital', tags: ['ia', 'regulación'], status: 'util', notes: 'Obligaciones por niveles de riesgo', createdAt: '2026-09-01T10:00:00.000Z' }),
  r({ id: 'b', title: 'Curso de Claude Code', type: 'video', url: 'https://youtube.com/watch?v=xyz', category: 'Programación', tags: ['ia', 'agentes'], status: 'explorar', createdAt: '2026-10-10T10:00:00.000Z' }),
  r({ id: 'c', title: 'Apuntes contratos', type: 'nota', category: 'Derecho civil', tags: ['contratos'], status: 'aplicado', createdAt: '2026-10-05T10:00:00.000Z' }),
  r({ id: 'd', title: 'artículo sobre legaltech', type: 'articulo', url: 'https://ejemplo.com/legaltech', tags: [], status: 'explorar', createdAt: '2026-08-15T10:00:00.000Z' }),
];

describe('modelo', () => {
  it('exige título y rellena valores por defecto', () => {
    expect(sanitizeResource({ title: '   ' })).toBeNull();
    expect(sanitizeResource(null)).toBeNull();
    const x = sanitizeResource({ title: ' Hola ', type: 'raro', status: 'nope' });
    expect(x.title).toBe('Hola');
    expect(x.type).toBe('otro');
    expect(x.status).toBe('explorar');
    expect(x.tags).toEqual([]);
    expect(typeof x.id).toBe('string');
    expect(x.createdAt).toMatch(/^\d{4}-/);
  });

  it('limpia etiquetas: minúsculas, sin #, sin duplicados', () => {
    expect(cleanTags(['#IA', 'ia', ' Derecho  Digital ', '', 3])).toEqual(['ia', 'derecho digital', '3']);
    expect(cleanTags('uno, dos,uno')).toEqual(['uno', 'dos']);
  });

  it('compara contenido sin fechas', () => {
    const a = sample[0];
    expect(sameContent(a, { ...a, updatedAt: 'x' })).toBe(true);
    expect(sameContent(a, { ...a, title: 'otro' })).toBe(false);
  });
});

describe('búsqueda, filtros y orden', () => {
  it('busca sin tildes ni mayúsculas en título, notas, url, categoría y etiquetas', () => {
    expect(queryResources(sample, { query: 'reglamento' }).map((x) => x.id)).toEqual(['a']);
    expect(queryResources(sample, { query: 'RIESGO' }).map((x) => x.id)).toEqual(['a']);
    expect(queryResources(sample, { query: 'youtube' }).map((x) => x.id)).toEqual(['b']);
    expect(queryResources(sample, { query: 'civil' }).map((x) => x.id)).toEqual(['c']);
    expect(queryResources(sample, { query: '#agentes' }).map((x) => x.id)).toEqual(['b']);
    expect(queryResources(sample, { query: 'regulacion' }).map((x) => x.id)).toEqual(['a']);
    expect(queryResources(sample, { query: 'video' }).map((x) => x.id)).toEqual(['b']);
  });

  it('todas las palabras deben aparecer', () => {
    expect(matchesQuery(sample[1], 'claude curso')).toBe(true);
    expect(matchesQuery(sample[1], 'claude contratos')).toBe(false);
  });

  it('combina búsqueda con filtros', () => {
    const f = { ...EMPTY_FILTERS, tags: ['ia'] };
    expect(queryResources(sample, { filters: f }).map((x) => x.id)).toEqual(['b', 'a']);
    expect(queryResources(sample, { query: 'curso', filters: f }).map((x) => x.id)).toEqual(['b']);
    expect(queryResources(sample, { query: 'curso', filters: { ...f, status: 'util' } })).toEqual([]);
    expect(queryResources(sample, { filters: { ...EMPTY_FILTERS, type: 'nota' } }).map((x) => x.id)).toEqual(['c']);
    expect(queryResources(sample, { filters: { ...EMPTY_FILTERS, category: 'derecho DIGITAL' } }).map((x) => x.id)).toEqual(['a']);
    expect(queryResources(sample, { filters: { ...EMPTY_FILTERS, tags: ['ia', 'agentes'] } }).map((x) => x.id)).toEqual(['b']);
  });

  it('ordena por fecha y por título', () => {
    expect(queryResources(sample, { sort: 'recientes' }).map((x) => x.id)).toEqual(['b', 'c', 'a', 'd']);
    expect(queryResources(sample, { sort: 'antiguos' }).map((x) => x.id)).toEqual(['d', 'a', 'c', 'b']);
    expect(queryResources(sample, { sort: 'az' }).map((x) => x.title)).toEqual([
      'Apuntes contratos',
      'artículo sobre legaltech',
      'Curso de Claude Code',
      'Reglamento de IA de la UE',
    ]);
    expect(queryResources(sample, { sort: 'za' })[0].id).toBe('a');
  });

  it('recoge categorías y etiquetas por uso', () => {
    expect(collectTags(sample)[0]).toBe('ia');
    expect(collectCategories(sample)).toHaveLength(3);
  });
});

describe('enlaces', () => {
  it('valida y completa URLs', () => {
    expect(parseUrlInput('')).toEqual({ url: '' });
    expect(parseUrlInput('ejemplo.com/a').url).toBe('https://ejemplo.com/a');
    expect(parseUrlInput('hola mundo').error).toBeTruthy();
    expect(parseUrlInput('noesunaurl').error).toBeTruthy();
  });

  it('sugiere tipo y título', () => {
    expect(guessType('https://youtu.be/abc')).toBe('video');
    expect(guessType('https://www.boe.es/doc.pdf')).toBe('documento');
    expect(guessType('https://elpais.com')).toBe('web');
    expect(titleFromUrl('https://www.ejemplo.com/mi-articulo-genial')).toBe('mi articulo genial (ejemplo.com)');
    expect(titleFromUrl('https://www.youtube.com/watch?v=abc')).toBe('Vídeo de youtube.com');
    expect(titleFromUrl('https://boe.es/')).toBe('Enlace de boe.es');
    expect(titleFromUrl('https://ejemplo.com/%E0%A4%A')).toBe('Enlace de ejemplo.com');
  });

  it('reconoce el mismo enlace con distinto formato', () => {
    expect(urlKey('https://www.ejemplo.com/a/?utm_source=x')).toBe(urlKey('http://ejemplo.com/a'));
  });
});

describe('copias de seguridad', () => {
  it('ida y vuelta: exportar y volver a leer', () => {
    const backup = buildBackup(sample);
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.resources).toHaveLength(4);
    expect(parsed.invalid).toBe(0);
    expect(parsed.resources.find((x) => x.id === 'a')).toEqual(sample[0]);
  });

  it('rechaza archivos no válidos con mensajes claros', () => {
    expect(() => parseBackup('no json')).toThrow(BackupError);
    expect(() => parseBackup('{"foo":1}')).toThrow(/formato/);
    expect(() => parseBackup('{"app":"otra","resources":[]}')).toThrow(/otra aplicación/);
    expect(() => parseBackup('{"resources":[]}')).toThrow(/vacía/);
    expect(() => parseBackup('{"resources":[{"title":""}]}')).toThrow(/válido/);
    expect(() => parseBackup('{"app":"almacen-conocimiento","formatVersion":99,"resources":[{"title":"x"}]}')).toThrow(/más nueva/);
  });

  it('ignora entradas inválidas y cuenta cuántas', () => {
    const parsed = parseBackup(JSON.stringify({ resources: [{ title: 'ok' }, { nope: 1 }, 'texto'] }));
    expect(parsed.resources).toHaveLength(1);
    expect(parsed.invalid).toBe(2);
  });

  it('al combinar evita duplicados por id, por enlace y por título', () => {
    const incoming = [
      sample[0], // mismo id y contenido
      { ...sample[2], title: 'Apuntes contratos v2', updatedAt: '2026-12-01T00:00:00.000Z' }, // versión más reciente
      { ...sample[3], updatedAt: '2020-01-01T00:00:00.000Z', title: 'cambiado' }, // versión más antigua
      r({ id: 'nuevo1', title: 'Otro vídeo', url: 'https://www.youtube.com/watch?v=xyz&utm_source=x' }), // mismo enlace que b
      r({ id: 'nuevo2', title: 'Reglamento de IA de la UE', notes: 'Obligaciones por niveles de riesgo' }), // misma nota que a
      r({ id: 'nuevo3', title: 'Algo nuevo' }),
      r({ id: 'nuevo4', title: 'Algo nuevo' }), // duplicado dentro de la propia copia
    ];
    const plan = planImport(sample, incoming);
    expect(plan.identical).toBe(1);
    expect(plan.toUpdate.map((x) => x.id)).toEqual(['c']);
    expect(plan.keptLocal).toBe(1);
    expect(plan.duplicates).toBe(3);
    expect(plan.toAdd.map((x) => x.id)).toEqual(['nuevo3']);
  });

  it('describe el resultado', () => {
    expect(describeImportResult({ added: 2, skipped: 1 })).toMatch(/2 añadidos, 1 ya existían/);
    expect(describeImportResult({})).toMatch(/nada nuevo/);
  });
});

describe('revisión', () => {
  const now = new Date('2026-10-16T10:00:00.000Z').getTime();
  it('cuenta por estado y lista pendientes y útiles', () => {
    expect(countByStatus(sample)).toEqual({ explorar: 2, util: 1, aplicado: 1 });
    expect(oldestPending(sample).map((x) => x.id)).toEqual(['d', 'b']);
    expect(usefulOnes(sample).map((x) => x.id).sort()).toEqual(['a', 'c']);
  });

  it('la selección al azar prefiere recursos de hace más de una semana', () => {
    const { items, onlyOld } = randomSelection(sample, 3, () => 0.5, now);
    expect(onlyOld).toBe(true);
    expect(items.map((x) => x.id).sort()).toEqual(['a', 'c', 'd']);
    const recent = randomSelection([sample[1]], 3, Math.random, now);
    expect(recent.onlyOld).toBe(false);
    expect(recent.items).toHaveLength(1);
  });
});

describe('rutas', () => {
  it('interpreta la dirección', () => {
    expect(parseHash('')).toEqual({ name: 'library' });
    expect(parseHash('#/nuevo')).toEqual({ name: 'new' });
    expect(parseHash('#/r/abc')).toEqual({ name: 'detail', id: 'abc' });
    expect(parseHash('#/r/abc/editar')).toEqual({ name: 'edit', id: 'abc' });
    expect(parseHash('#/datos')).toEqual({ name: 'data' });
    expect(parseHash('#/cualquiercosa')).toEqual({ name: 'library' });
  });
});
