// Búsqueda, filtros y ordenación. Todo ocurre en el dispositivo.
import { typeLabel } from './model.js';

// Minúsculas y sin tildes: «Vídeo» y «video» encuentran lo mismo.
export function normalizeText(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export const EMPTY_FILTERS = { type: '', status: '', category: '', tags: [] };

export function activeFilterCount(filters) {
  return (
    (filters.type ? 1 : 0) +
    (filters.status ? 1 : 0) +
    (filters.category ? 1 : 0) +
    filters.tags.length
  );
}

function searchableText(r) {
  return normalizeText(
    [r.title, r.notes, r.url, r.category, r.tags.join(' '), typeLabel(r.type)].join('\n'),
  );
}

// Cada palabra buscada debe aparecer en algún campo del recurso.
export function matchesQuery(resource, query) {
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = searchableText(resource);
  return terms.every((t) => haystack.includes(normalizeText(t.replace(/^#/, ''))));
}

export function matchesFilters(resource, filters) {
  if (filters.type && resource.type !== filters.type) return false;
  if (filters.status && resource.status !== filters.status) return false;
  if (filters.category && normalizeText(resource.category) !== normalizeText(filters.category)) {
    return false;
  }
  if (filters.tags.length && !filters.tags.every((t) => resource.tags.includes(t))) return false;
  return true;
}

export const SORTS = [
  { value: 'recientes', label: 'Más recientes' },
  { value: 'antiguos', label: 'Más antiguos' },
  { value: 'az', label: 'Título A–Z' },
  { value: 'za', label: 'Título Z–A' },
];

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

export function sortResources(list, sort) {
  const copy = [...list];
  switch (sort) {
    case 'antiguos':
      return copy.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case 'az':
      return copy.sort((a, b) => collator.compare(a.title, b.title));
    case 'za':
      return copy.sort((a, b) => collator.compare(b.title, a.title));
    case 'recientes':
    default:
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export function queryResources(resources, { query = '', filters = EMPTY_FILTERS, sort = 'recientes' }) {
  const result = resources.filter((r) => matchesFilters(r, filters) && matchesQuery(r, query));
  return sortResources(result, sort);
}

// Categorías y etiquetas existentes, ordenadas por uso.
export function collectCategories(resources) {
  const counts = new Map();
  for (const r of resources) {
    if (!r.category) continue;
    const key = normalizeText(r.category);
    const prev = counts.get(key);
    counts.set(key, { name: prev?.name ?? r.category, count: (prev?.count ?? 0) + 1 });
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || collator.compare(a.name, b.name))
    .map((c) => c.name);
}

export function collectTags(resources) {
  const counts = new Map();
  for (const r of resources) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || collator.compare(a[0], b[0]))
    .map(([t]) => t);
}
