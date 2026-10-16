// Exportación e importación de copias de seguridad en JSON.
import { sanitizeResource, sameContent } from './model.js';
import { urlKey } from './url.js';
import { normalizeText } from './search.js';

export const APP_ID = 'almacen-conocimiento';
export const FORMAT_VERSION = 1;
export const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

export function buildBackup(resources, now = new Date()) {
  return {
    app: APP_ID,
    formatVersion: FORMAT_VERSION,
    exportedAt: now.toISOString(),
    count: resources.length,
    resources,
  };
}

export function backupFileName(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `almacen-conocimiento-${stamp}.json`;
}

export class BackupError extends Error {}

// Lee el texto de un archivo y devuelve los recursos válidos que contiene.
// Lanza BackupError con un mensaje claro si el archivo no sirve.
export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('El archivo no es un JSON válido. Elige una copia exportada desde Almacén.');
  }

  let items;
  if (Array.isArray(data)) {
    items = data;
  } else if (data && typeof data === 'object' && Array.isArray(data.resources)) {
    if (data.app && data.app !== APP_ID) {
      throw new BackupError('Este archivo pertenece a otra aplicación, no a Almacén de conocimiento.');
    }
    if (typeof data.formatVersion === 'number' && data.formatVersion > FORMAT_VERSION) {
      throw new BackupError('La copia se creó con una versión más nueva de la app. Actualiza la app e inténtalo de nuevo.');
    }
    items = data.resources;
  } else {
    throw new BackupError('El archivo no tiene el formato de una copia de Almacén (falta la lista de recursos).');
  }

  const byId = new Map();
  let invalid = 0;
  for (const raw of items) {
    const r = sanitizeResource(raw);
    if (!r) {
      invalid += 1;
      continue;
    }
    const prev = byId.get(r.id);
    // Si el mismo id aparece dos veces, nos quedamos con la versión más reciente.
    if (!prev || r.updatedAt > prev.updatedAt) byId.set(r.id, r);
  }
  const resources = [...byId.values()];
  if (resources.length === 0) {
    throw new BackupError(
      items.length === 0
        ? 'La copia está vacía: no contiene ningún recurso.'
        : 'Ningún recurso del archivo es válido (todos necesitan al menos un título).',
    );
  }
  return { resources, invalid, total: items.length };
}

function signature(r) {
  if (r.url) return `u:${urlKey(r.url)}`;
  return `t:${normalizeText(r.title).trim()}|${normalizeText(r.notes).trim()}`;
}

// Calcula qué pasaría al combinar una copia con los datos actuales,
// sin modificar nada todavía.
export function planImport(existing, incoming) {
  const byId = new Map(existing.map((r) => [r.id, r]));
  const bySignature = new Map(existing.map((r) => [signature(r), r]));
  const plan = { toAdd: [], toUpdate: [], identical: 0, keptLocal: 0, duplicates: 0 };
  const seenSignatures = new Set();

  for (const r of incoming) {
    const local = byId.get(r.id);
    if (local) {
      if (sameContent(local, r)) plan.identical += 1;
      else if (r.updatedAt > local.updatedAt) plan.toUpdate.push(r);
      else plan.keptLocal += 1;
      continue;
    }
    const sig = signature(r);
    if (bySignature.has(sig) || seenSignatures.has(sig)) {
      plan.duplicates += 1;
      continue;
    }
    seenSignatures.add(sig);
    plan.toAdd.push(r);
  }
  return plan;
}

export function describeImportResult({ added, updated, skipped, invalid, replaced }) {
  const parts = [];
  if (replaced) parts.push(`${replaced} recursos restaurados`);
  if (added) parts.push(`${added} añadidos`);
  if (updated) parts.push(`${updated} actualizados`);
  if (skipped) parts.push(`${skipped} ya existían y se han omitido`);
  if (invalid) parts.push(`${invalid} entradas no válidas ignoradas`);
  if (parts.length === 0) return 'No había nada nuevo que importar: tu biblioteca ya contenía todo.';
  return `Importación completada: ${parts.join(', ')}.`;
}
