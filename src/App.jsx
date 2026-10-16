import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as storage from './data/storage.js';
import { sanitizeResource, newId } from './lib/model.js';
import { EMPTY_FILTERS, collectCategories, collectTags } from './lib/search.js';
import { describeImportResult } from './lib/backup.js';
import { daysSince } from './lib/format.js';
import { useRoute, navigate, paths } from './lib/route.js';
import LibraryView from './views/LibraryView.jsx';
import ResourceForm from './views/ResourceForm.jsx';
import ResourceDetail from './views/ResourceDetail.jsx';
import ReviewView from './views/ReviewView.jsx';
import DataView from './views/DataView.jsx';
import Nav from './components/Nav.jsx';
import { Toast } from './components/Feedback.jsx';
import Icon from './components/Icon.jsx';

const SORT_KEY = 'almacen.sort';
const BACKUP_REMINDER_DAYS = 14;
const BACKUP_REMINDER_MIN = 5;

function readSort() {
  try {
    return localStorage.getItem(SORT_KEY) || 'recientes';
  } catch {
    return 'recientes';
  }
}

export default function App() {
  const route = useRoute();
  const [resources, setResources] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [loadError, setLoadError] = useState('');
  const [lastExport, setLastExport] = useState(null);
  const [persisted, setPersisted] = useState(null);
  const [toast, setToast] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const [view, setViewState] = useState(() => ({ query: '', filters: EMPTY_FILTERS, sort: readSort() }));
  const toastId = useRef(0);

  const notify = useCallback((message, tone = 'ok', action = null) => {
    toastId.current += 1;
    setToast({ id: toastId.current, message, tone, action });
  }, []);
  const closeToast = useCallback(() => setToast(null), []);

  const setView = useCallback((next) => {
    setViewState(next);
    try {
      localStorage.setItem(SORT_KEY, next.sort);
    } catch {
      /* preferencia no esencial */
    }
  }, []);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [all, exported] = await Promise.all([storage.getAllResources(), storage.getMeta('lastExport')]);
      setResources(all.map((r) => sanitizeResource(r)).filter(Boolean));
      setLastExport(exported);
      setStatus('ready');
      storage.isPersisted().then(setPersisted);
    } catch (err) {
      setLoadError(err?.message || 'No se pudo abrir el almacenamiento.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Cada vez que cambias de pantalla, vuelve arriba (salvo en la biblioteca,
  // donde se conserva la posición al volver de un recurso).
  useEffect(() => {
    if (route.name !== 'library') window.scrollTo(0, 0);
  }, [route.name, route.id]);

  // El resaltado del recurso recién guardado dura unos segundos.
  useEffect(() => {
    if (!highlightId) return undefined;
    const t = setTimeout(() => setHighlightId(null), 2500);
    return () => clearTimeout(t);
  }, [highlightId]);

  const byId = useMemo(() => new Map(resources.map((r) => [r.id, r])), [resources]);
  const categories = useMemo(() => collectCategories(resources), [resources]);
  const tags = useMemo(() => collectTags(resources), [resources]);

  // ---- Acciones -----------------------------------------------------------

  const saveResource = async (fields, existing) => {
    const now = new Date().toISOString();
    const resource = sanitizeResource(
      existing
        ? { ...existing, ...fields, updatedAt: now }
        : { ...fields, id: newId(), createdAt: now, updatedAt: now },
      now,
    );
    if (!resource) {
      notify('El recurso necesita un título.', 'error');
      return false;
    }
    try {
      await storage.putResource(resource);
    } catch (err) {
      notify(err.message, 'error');
      return false;
    }
    setResources((list) => (existing ? list.map((r) => (r.id === resource.id ? resource : r)) : [resource, ...list]));

    if (existing) {
      navigate(paths.detail(resource.id), { replace: true });
      notify('Cambios guardados');
    } else {
      setHighlightId(resource.id);
      navigate(paths.library, { replace: true });
      notify('Recurso guardado', 'ok', { label: 'Ver', onClick: () => navigate(paths.detail(resource.id)) });
      if (persisted !== true) storage.requestPersistence().then(setPersisted);
    }
    return true;
  };

  const changeStatus = async (resource, newStatus) => {
    const updated = { ...resource, status: newStatus, updatedAt: new Date().toISOString() };
    try {
      await storage.putResource(updated);
      setResources((list) => list.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const deleteResource = async (resource) => {
    try {
      await storage.deleteResource(resource.id);
    } catch (err) {
      notify(err.message, 'error');
      return;
    }
    setResources((list) => list.filter((r) => r.id !== resource.id));
    navigate(paths.library, { replace: true });
    notify('Recurso eliminado', 'ok', {
      label: 'Deshacer',
      onClick: async () => {
        try {
          await storage.putResource(resource);
          setResources((list) => (list.some((r) => r.id === resource.id) ? list : [resource, ...list]));
          notify('Recurso recuperado');
        } catch (err) {
          notify(err.message, 'error');
        }
      },
    });
  };

  const showInLibrary = (patch) => {
    setView({ ...view, query: '', filters: { ...EMPTY_FILTERS, ...patch } });
    navigate(paths.library);
  };

  const markExported = async (message) => {
    const now = new Date().toISOString();
    setLastExport(now);
    notify(message);
    try {
      await storage.setMeta('lastExport', now);
    } catch {
      /* no es grave: solo sirve para el recordatorio */
    }
  };

  const importBackup = async (mode, pending) => {
    try {
      if (mode === 'replace') {
        await storage.replaceAllResources(pending.resources);
      } else {
        await storage.putResources([...pending.plan.toAdd, ...pending.plan.toUpdate]);
      }
      const all = await storage.getAllResources();
      setResources(all.map((r) => sanitizeResource(r)).filter(Boolean));
    } catch (err) {
      notify(`No se ha importado nada. ${err.message}`, 'error');
      return false;
    }
    const message =
      mode === 'replace'
        ? describeImportResult({ replaced: pending.resources.length, invalid: pending.invalid })
        : describeImportResult({
            added: pending.plan.toAdd.length,
            updated: pending.plan.toUpdate.length,
            skipped: pending.plan.identical + pending.plan.duplicates + pending.plan.keptLocal,
            invalid: pending.invalid,
          });
    notify(message);
    if (persisted !== true) storage.requestPersistence().then(setPersisted);
    return true;
  };

  // ---- Pantallas ----------------------------------------------------------

  let screen;
  if (status === 'loading') {
    screen = <div className="page page--loading" aria-busy="true"><p className="loading">Abriendo tu almacén…</p></div>;
  } else if (status === 'error') {
    screen = (
      <div className="page">
        <div className="empty">
          <h1 className="empty__title">No se puede abrir tu almacén</h1>
          <p className="empty__text">{loadError}</p>
          <p className="empty__text">Si estás en navegación privada, ábrelo en una pestaña normal. Tus datos no se han borrado.</p>
          <button type="button" className="btn btn--primary" onClick={load}>Reintentar</button>
        </div>
      </div>
    );
  } else {
    switch (route.name) {
      case 'new':
        screen = (
          <ResourceForm
            key="new"
            categories={categories}
            tags={tags}
            onSave={(fields) => saveResource(fields, null)}
            onCancel={() => navigate(paths.library, { replace: true })}
          />
        );
        break;
      case 'edit': {
        const resource = byId.get(route.id);
        screen = resource ? (
          <ResourceForm
            key={`edit-${resource.id}`}
            resource={resource}
            categories={categories}
            tags={tags}
            onSave={(fields) => saveResource(fields, resource)}
            onCancel={() => navigate(paths.detail(resource.id), { replace: true })}
          />
        ) : (
          <ResourceDetail resource={null} />
        );
        break;
      }
      case 'detail':
        screen = (
          <ResourceDetail
            resource={byId.get(route.id)}
            onStatusChange={changeStatus}
            onDelete={deleteResource}
            onFilterTag={(t) => showInLibrary({ tags: [t] })}
            onFilterCategory={(c) => showInLibrary({ category: c })}
          />
        );
        break;
      case 'review':
        screen = <ReviewView resources={resources} onShowStatus={(s) => showInLibrary({ status: s })} />;
        break;
      case 'data':
        screen = (
          <DataView
            resources={resources}
            lastExport={lastExport}
            persisted={persisted}
            onExported={markExported}
            onImport={importBackup}
            notify={notify}
          />
        );
        break;
      default: {
        const exportAge = lastExport ? daysSince(lastExport) : Infinity;
        const remindBackup = resources.length >= BACKUP_REMINDER_MIN && exportAge >= BACKUP_REMINDER_DAYS;
        screen = (
          <LibraryView
            resources={resources}
            view={view}
            setView={setView}
            highlightId={highlightId}
            backupReminder={
              remindBackup && (
                <a className="reminder" href={paths.data}>
                  <Icon name="data" size={18} />
                  <span>
                    {lastExport ? `Tu última copia es de hace ${exportAge} días.` : 'Aún no has exportado ninguna copia.'}{' '}
                    <strong>Exportar ahora</strong>
                  </span>
                </a>
              )
            }
          />
        );
      }
    }
  }

  const isForm = route.name === 'new' || route.name === 'edit';

  return (
    <div className={`app${isForm ? ' app--form' : ''}`}>
      <a className="skip-link" href="#main">Saltar al contenido</a>
      <Nav route={route} hidden={isForm} />
      <main id="main" className="main">{screen}</main>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
