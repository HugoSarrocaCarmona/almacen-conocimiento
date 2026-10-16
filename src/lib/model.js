// Modelo de datos de un recurso y utilidades para crearlo y validarlo.
// Todo lo que entra en la base de datos (desde el formulario o desde una
// copia importada) pasa por `sanitizeResource`, así los datos siempre
// tienen la misma forma.

export const TYPES = [
  { value: 'articulo', label: 'Artículo' },
  { value: 'video', label: 'Vídeo' },
  { value: 'web', label: 'Web' },
  { value: 'idea', label: 'Idea' },
  { value: 'nota', label: 'Nota' },
  { value: 'documento', label: 'Documento' },
  { value: 'otro', label: 'Otro' },
];

export const STATUSES = [
  { value: 'explorar', label: 'Por explorar', level: 1 },
  { value: 'util', label: 'Útil', level: 2 },
  { value: 'aplicado', label: 'Aplicado', level: 3 },
];

export const DEFAULT_TYPE = 'nota';
export const DEFAULT_STATUS = 'explorar';

const TYPE_VALUES = new Set(TYPES.map((t) => t.value));
const STATUS_VALUES = new Set(STATUSES.map((s) => s.value));

export const LIMITS = { title: 300, url: 2000, notes: 20000, category: 80, tag: 40, tags: 30 };

export function typeLabel(value) {
  return TYPES.find((t) => t.value === value)?.label ?? 'Otro';
}

export function statusInfo(value) {
  return STATUSES.find((s) => s.value === value) ?? STATUSES[0];
}

// crypto.randomUUID solo existe en contextos seguros (https o localhost).
// Si abres la app por la red local con http, usamos un generador alternativo.
export function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const rnd = () => Math.random().toString(16).slice(2, 10);
  return `${Date.now().toString(16)}-${rnd()}-${rnd()}`;
}

function cleanString(value, max) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

export function cleanTag(tag) {
  return cleanString(String(tag ?? ''), LIMITS.tag)
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

// Acepta un array o un texto separado por comas y devuelve etiquetas únicas.
export function cleanTags(tags) {
  const list = Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',') : [];
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    if (typeof raw !== 'string' && typeof raw !== 'number') continue;
    const tag = cleanTag(String(raw));
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      out.push(tag);
    }
    if (out.length >= LIMITS.tags) break;
  }
  return out;
}

function validDate(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Convierte cualquier objeto en un recurso válido, o devuelve null si no
// se puede (por ejemplo, si no tiene título).
export function sanitizeResource(raw, now = new Date().toISOString()) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const title = cleanString(raw.title, LIMITS.title);
  if (!title) return null;
  const createdAt = validDate(raw.createdAt) ?? now;
  const updatedAt = validDate(raw.updatedAt) ?? createdAt;
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim().slice(0, 100) : newId();
  return {
    id,
    title,
    type: TYPE_VALUES.has(raw.type) ? raw.type : 'otro',
    url: cleanString(raw.url, LIMITS.url),
    notes: typeof raw.notes === 'string' ? raw.notes.slice(0, LIMITS.notes).trim() : '',
    category: cleanString(raw.category, LIMITS.category),
    tags: cleanTags(raw.tags),
    status: STATUS_VALUES.has(raw.status) ? raw.status : DEFAULT_STATUS,
    createdAt,
    updatedAt,
  };
}

// Compara el contenido de dos recursos (sin fechas de modificación).
export function sameContent(a, b) {
  return (
    a.title === b.title &&
    a.type === b.type &&
    a.url === b.url &&
    a.notes === b.notes &&
    a.category === b.category &&
    a.status === b.status &&
    a.tags.join('|') === b.tags.join('|')
  );
}
