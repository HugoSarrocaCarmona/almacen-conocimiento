// Almacenamiento local con IndexedDB (la base de datos del navegador).
// Esta es la única pieza que sabe dónde se guardan los datos: si en el
// futuro se añade sincronización, solo habría que cambiar este archivo.

const DB_NAME = 'almacen-conocimiento';
const DB_VERSION = 1;
const RESOURCES = 'resources';
const META = 'meta';

export class StorageError extends Error {}

function toStorageError(err) {
  if (err instanceof StorageError) return err;
  const name = err?.name ?? '';
  if (name === 'QuotaExceededError') {
    return new StorageError('No queda espacio de almacenamiento en este dispositivo. Libera espacio o exporta y borra recursos.');
  }
  if (name === 'InvalidStateError' || name === 'SecurityError') {
    return new StorageError('El navegador no permite guardar datos aquí (puede que estés en navegación privada).');
  }
  return new StorageError(`No se pudo acceder al almacenamiento local${err?.message ? `: ${err.message}` : '.'}`);
}

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new StorageError('Este navegador no permite guardar datos (IndexedDB no está disponible).'));
      return;
    }
    let req;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      reject(toStorageError(err));
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(RESOURCES)) {
        const store = db.createObjectStore(RESOURCES, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      db.onclose = () => {
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => reject(toStorageError(req.error));
    req.onblocked = () =>
      reject(new StorageError('La base de datos está bloqueada por otra pestaña. Cierra las demás pestañas de la app.'));
  }).catch((err) => {
    dbPromise = null;
    throw err;
  });
  return dbPromise;
}

// Ejecuta una transacción y resuelve cuando se ha guardado de verdad.
async function transaction(storeNames, mode, work) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    let tx;
    try {
      tx = db.transaction(storeNames, mode);
    } catch (err) {
      dbPromise = null;
      reject(toStorageError(err));
      return;
    }
    let result;
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(toStorageError(tx.error));
    tx.onabort = () => reject(toStorageError(tx.error ?? new Error('operación cancelada')));
    try {
      work(tx, (value) => {
        result = value;
      });
    } catch (err) {
      try {
        tx.abort();
      } catch {
        /* ya cerrada */
      }
      reject(toStorageError(err));
    }
  });
}

export function getAllResources() {
  return transaction([RESOURCES], 'readonly', (tx, done) => {
    const req = tx.objectStore(RESOURCES).getAll();
    req.onsuccess = () => done(req.result ?? []);
  });
}

export function putResource(resource) {
  return transaction([RESOURCES], 'readwrite', (tx) => {
    tx.objectStore(RESOURCES).put(resource);
  });
}

export function putResources(resources) {
  return transaction([RESOURCES], 'readwrite', (tx) => {
    const store = tx.objectStore(RESOURCES);
    for (const r of resources) store.put(r);
  });
}

export function deleteResource(id) {
  return transaction([RESOURCES], 'readwrite', (tx) => {
    tx.objectStore(RESOURCES).delete(id);
  });
}

// Sustituye todo el contenido en una sola transacción: si algo falla,
// no se borra nada.
export function replaceAllResources(resources) {
  return transaction([RESOURCES], 'readwrite', (tx) => {
    const store = tx.objectStore(RESOURCES);
    store.clear();
    for (const r of resources) store.put(r);
  });
}

export function getMeta(key) {
  return transaction([META], 'readonly', (tx, done) => {
    const req = tx.objectStore(META).get(key);
    req.onsuccess = () => done(req.result ?? null);
  });
}

export function setMeta(key, value) {
  return transaction([META], 'readwrite', (tx) => {
    tx.objectStore(META).put(value, key);
  });
}

// Pide al navegador que no borre los datos automáticamente.
export async function requestPersistence() {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

export async function isPersisted() {
  try {
    if (!navigator.storage?.persisted) return null;
    return await navigator.storage.persisted();
  } catch {
    return null;
  }
}

// Solo para pruebas.
export async function _closeForTests() {
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
}
