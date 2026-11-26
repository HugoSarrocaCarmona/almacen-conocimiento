// Almacenamiento en claude.ai (versión «nube» de la app).
// Tiene las mismas funciones que storage.js, pero guarda los recursos en la
// base de datos del artifact publicado en claude.ai. Así los datos son los
// mismos en el iPhone y en el ordenador, y Claude puede leerlos y añadir
// recursos desde una conversación.
//
// Estructura en la base de datos:
//   recursos/<id>   un documento por recurso (mismos campos que el modelo)
//   meta/estado     { lastExport }

export class StorageError extends Error {}

const RESOURCES = 'recursos';
const META_DOC = 'meta/estado';
const TIMEOUT_MS = 10000;

let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await window.claude?.use?.('db');
      if (!db) {
        throw new StorageError(
          'No se puede abrir la base de datos. Abre el almacén desde claude.ai con tu sesión iniciada.',
        );
      }
      return db;
    })().catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

function toStorageError(err) {
  if (err instanceof StorageError) return err;
  switch (err?.code) {
    case 'quota_exceeded':
      return new StorageError('El almacén está lleno. Borra algunos recursos para poder añadir más.');
    case 'resource_exhausted':
      return new StorageError('Demasiadas operaciones seguidas. Espera unos segundos y vuelve a intentarlo.');
    case 'invalid_argument':
      return new StorageError('No tienes permiso para cambiar este almacén, o el recurso no es válido.');
    case 'revoked':
    case 'not_granted':
      return new StorageError('Se ha perdido el acceso a la base de datos. Recarga la página.');
    default:
      return new StorageError('No se puede conectar con la base de datos. Comprueba la conexión y vuelve a intentarlo.');
  }
}

function withTimeout(promise) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new StorageError('La base de datos no responde. Comprueba la conexión y vuelve a intentarlo.')),
      TIMEOUT_MS,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Ejecuta una operación; si falla por un corte pasajero, la repite una vez.
async function run(work) {
  try {
    const db = await withTimeout(getDb());
    try {
      return await withTimeout(work(db));
    } catch (err) {
      if (err?.code !== 'unavailable') throw err;
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
      return await withTimeout(work(db));
    }
  } catch (err) {
    throw toStorageError(err);
  }
}

// La base de datos solo admite objetos JSON: quitamos los `undefined`.
function plain(resource) {
  return JSON.parse(JSON.stringify(resource));
}

export function getAllResources() {
  return run(async (db) => {
    const snap = await db.collection(RESOURCES).get();
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  });
}

export function putResource(resource) {
  return run((db) => db.collection(RESOURCES).doc(resource.id).set(plain(resource)));
}

export async function putResources(resources) {
  // Una escritura cada vez: así no se satura la base de datos.
  for (const r of resources) await putResource(r);
}

export function deleteResource(id) {
  return run((db) => db.collection(RESOURCES).doc(id).delete());
}

// A diferencia de la versión local, aquí no hay transacciones: primero se
// guardan los de la copia y después se borran los que sobran, para que un
// fallo a medias nunca deje el almacén vacío.
export async function replaceAllResources(resources) {
  const keep = new Set(resources.map((r) => r.id));
  const current = await getAllResources();
  await putResources(resources);
  for (const r of current) if (!keep.has(r.id)) await deleteResource(r.id);
}

export function getMeta(key) {
  return run(async (db) => {
    const snap = await db.doc(META_DOC).get();
    return snap.exists ? (snap.data()?.[key] ?? null) : null;
  });
}

export function setMeta(key, value) {
  return run(async (db) => {
    const ref = db.doc(META_DOC);
    const snap = await ref.get();
    const body = snap.exists ? { ...snap.data(), [key]: value } : { [key]: value };
    await ref.set(body);
  });
}

// Avisa de los cambios hechos desde otro dispositivo o por Claude.
// Devuelve la función para dejar de escuchar.
export function subscribe(onChange) {
  let unsubscribe = () => {};
  let stopped = false;
  getDb()
    .then((db) => {
      if (stopped) return;
      unsubscribe = db.collection(RESOURCES).onSnapshot(
        (snap) => {
          if (snap.metadata.fromCache) return;
          onChange(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
        },
        () => {
          /* sin avisos en directo; la app sigue funcionando */
        },
      );
    })
    .catch(() => {});
  return () => {
    stopped = true;
    unsubscribe();
  };
}

// En la nube los datos no dependen del navegador.
export async function requestPersistence() {
  return true;
}

export async function isPersisted() {
  return true;
}

export const isCloud = true;
