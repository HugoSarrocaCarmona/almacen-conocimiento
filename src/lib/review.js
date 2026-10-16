// Lógica sencilla de la sección «Revisar». Sin algoritmos complejos:
// recuentos, listas ordenadas por fecha y una selección al azar.
import { daysSince } from './format.js';

export const OLD_AFTER_DAYS = 7;

export function countByStatus(resources) {
  const counts = { explorar: 0, util: 0, aplicado: 0 };
  for (const r of resources) counts[r.status] = (counts[r.status] ?? 0) + 1;
  return counts;
}

// Los pendientes más antiguos primero: son los que más se olvidan.
export function oldestPending(resources, limit = 5) {
  return resources
    .filter((r) => r.status === 'explorar')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, limit);
}

// Lo útil o aplicado, lo último que tocaste primero.
export function usefulOnes(resources, limit = 5) {
  return resources
    .filter((r) => r.status === 'util' || r.status === 'aplicado')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

// Elige `n` recursos al azar entre los guardados hace más de una semana
// (o entre todos, si todavía no hay ninguno tan antiguo).
export function randomSelection(resources, n = 3, rng = Math.random, now = Date.now()) {
  const old = resources.filter((r) => daysSince(r.createdAt, now) >= OLD_AFTER_DAYS);
  const pool = old.length ? old : resources;
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return { items: copy.slice(0, n), onlyOld: old.length > 0 };
}
