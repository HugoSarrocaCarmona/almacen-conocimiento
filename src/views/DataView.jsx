import { useRef, useState } from 'react';
import {
  buildBackup,
  backupFileName,
  parseBackup,
  planImport,
  BackupError,
  MAX_IMPORT_BYTES,
} from '../lib/backup.js';
import { formatDateTime, daysSince } from '../lib/format.js';
import Icon from '../components/Icon.jsx';
import { ConfirmDialog } from '../components/Feedback.jsx';

function makeFile(resources) {
  const json = JSON.stringify(buildBackup(resources), null, 2);
  const name = backupFileName();
  return { json, name, blob: new Blob([json], { type: 'application/json' }) };
}

function canShareFiles() {
  try {
    const probe = new File(['{}'], 'test.json', { type: 'application/json' });
    return !!navigator.canShare?.({ files: [probe] });
  } catch {
    return false;
  }
}

export default function DataView({ resources, lastExport, persisted, onExported, onImport, notify }) {
  const fileRef = useRef(null);
  const [pending, setPending] = useState(null); // copia leída, a la espera de confirmar
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const shareFiles = canShareFiles();

  const download = () => {
    const { blob, name } = makeFile(resources);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    onExported(`Copia descargada: ${name}`);
  };

  const share = async () => {
    const { blob, name } = makeFile(resources);
    const file = new File([blob], name, { type: 'application/json' });
    try {
      await navigator.share({ files: [file], title: 'Copia de Almacén de conocimiento' });
      onExported('Copia compartida. Comprueba que se ha guardado donde elegiste.');
    } catch (err) {
      if (err?.name !== 'AbortError') notify('No se pudo compartir el archivo. Prueba con «Descargar copia».', 'error');
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setError('');
    setPending(null);
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setError('El archivo es demasiado grande para ser una copia de Almacén (más de 20 MB).');
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseBackup(text);
      const plan = planImport(resources, parsed.resources);
      setPending({ ...parsed, plan, fileName: file.name });
    } catch (err) {
      setError(err instanceof BackupError ? err.message : 'No se pudo leer el archivo. Comprueba que es una copia JSON de Almacén.');
    }
  };

  const runImport = async (mode) => {
    setBusy(true);
    const ok = await onImport(mode, pending);
    setBusy(false);
    if (ok) setPending(null);
  };

  const exportAge = lastExport ? daysSince(lastExport) : null;

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="page-title">Copias</h1>
        <p className="page-sub">Tus datos se guardan solo en este navegador. Exporta una copia de vez en cuando para no perderlos y para pasarlos a otro dispositivo.</p>
      </header>

      <section className="panel" aria-labelledby="d-export">
        <h2 id="d-export" className="section-title">Exportar</h2>
        <p className="section-note">
          {resources.length === 0
            ? 'Todavía no hay recursos que exportar.'
            : `Se guardarán tus ${resources.length} recursos en un archivo JSON.`}
          {' '}
          {lastExport
            ? `Última copia: ${formatDateTime(lastExport)}${exportAge >= 1 ? ` (hace ${exportAge} ${exportAge === 1 ? 'día' : 'días'})` : ''}.`
            : resources.length > 0 && 'Aún no has hecho ninguna copia.'}
        </p>
        <div className="button-stack">
          {shareFiles && (
            <button type="button" className="btn btn--primary btn--block" onClick={share} disabled={!resources.length}>
              <Icon name="share" /> Guardar copia en Archivos o iCloud
            </button>
          )}
          <button
            type="button"
            className={`btn btn--block ${shareFiles ? '' : 'btn--primary'}`}
            onClick={download}
            disabled={!resources.length}
          >
            <Icon name="data" /> Descargar copia (.json)
          </button>
        </div>
      </section>

      <section className="panel" aria-labelledby="d-import">
        <h2 id="d-import" className="section-title">Importar</h2>
        <p className="section-note">Elige un archivo exportado desde Almacén. Antes de cambiar nada verás qué contiene y podrás elegir cómo importarlo.</p>
        <input ref={fileRef} type="file" accept=".json,application/json" className="sr-only" id="import-file" onChange={onFile} />
        <button type="button" className="btn btn--block" onClick={() => fileRef.current?.click()} disabled={busy}>
          <Icon name="upload" /> Elegir archivo
        </button>

        {error && <p className="notice notice--error" role="alert">{error}</p>}

        {pending && (
          <div className="import-preview" aria-live="polite">
            <h3 className="import-preview__title">{pending.fileName}</h3>
            <ul className="import-preview__facts">
              <li>{pending.resources.length} recursos válidos en el archivo</li>
              {pending.invalid > 0 && <li>{pending.invalid} entradas no válidas (se ignorarán)</li>}
              {resources.length > 0 && (
                <>
                  <li>{pending.plan.toAdd.length} nuevos para tu biblioteca</li>
                  {pending.plan.toUpdate.length > 0 && <li>{pending.plan.toUpdate.length} con una versión más reciente que la tuya</li>}
                  {pending.plan.identical + pending.plan.duplicates + pending.plan.keptLocal > 0 && (
                    <li>{pending.plan.identical + pending.plan.duplicates + pending.plan.keptLocal} que ya tienes (no se duplicarán)</li>
                  )}
                </>
              )}
            </ul>
            {resources.length === 0 ? (
              <div className="button-stack">
                <button type="button" className="btn btn--primary btn--block" disabled={busy} onClick={() => runImport('merge')}>
                  Importar {pending.resources.length} recursos
                </button>
                <button type="button" className="btn btn--ghost btn--block" onClick={() => setPending(null)}>Cancelar</button>
              </div>
            ) : (
              <div className="button-stack">
                <button
                  type="button"
                  className="btn btn--primary btn--block"
                  disabled={busy || pending.plan.toAdd.length + pending.plan.toUpdate.length === 0}
                  onClick={() => runImport('merge')}
                >
                  Combinar con mi biblioteca
                </button>
                <button type="button" className="btn btn--danger-ghost btn--block" disabled={busy} onClick={() => setConfirmReplace(true)}>
                  Sustituir toda mi biblioteca
                </button>
                <button type="button" className="btn btn--ghost btn--block" onClick={() => setPending(null)}>Cancelar</button>
                {pending.plan.toAdd.length + pending.plan.toUpdate.length === 0 && (
                  <p className="field__hint">Tu biblioteca ya contiene todo lo de esta copia.</p>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="panel panel--quiet" aria-labelledby="d-about">
        <h2 id="d-about" className="section-title">Dónde están tus datos</h2>
        <ul className="plain-list">
          <li>Se guardan en este navegador y este dispositivo. No hay cuenta ni nube.</li>
          <li>Safari y la app instalada en la pantalla de inicio tienen almacenes separados: usa siempre la misma.</li>
          <li>Si borras los datos de navegación de Safari, se borrarán también. Exporta antes.</li>
          {persisted === true && <li>El navegador ha marcado tus datos como persistentes: no los borrará por falta de espacio.</li>}
        </ul>
      </section>

      <ConfirmDialog
        open={confirmReplace}
        title="¿Sustituir toda tu biblioteca?"
        message={
          pending
            ? `Se borrarán tus ${resources.length} recursos actuales y quedarán solo los ${pending.resources.length} de la copia. Si no estás seguro, exporta antes una copia de lo que tienes.`
            : ''
        }
        confirmLabel="Sustituir"
        danger
        onConfirm={() => {
          setConfirmReplace(false);
          runImport('replace');
        }}
        onCancel={() => setConfirmReplace(false)}
      />
    </div>
  );
}
