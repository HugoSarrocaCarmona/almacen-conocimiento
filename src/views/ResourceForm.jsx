import { useEffect, useRef, useState } from 'react';
import { TYPES, STATUSES, DEFAULT_STATUS, DEFAULT_TYPE, LIMITS, cleanTags } from '../lib/model.js';
import { parseUrlInput, guessType, titleFromUrl } from '../lib/url.js';
import ChipGroup from '../components/ChipGroup.jsx';
import TagInput from '../components/TagInput.jsx';
import Icon from '../components/Icon.jsx';
import { ConfirmDialog } from '../components/Feedback.jsx';

const canPaste = typeof navigator !== 'undefined' && !!navigator.clipboard?.readText;

function initialState(resource) {
  return {
    title: resource?.title ?? '',
    url: resource?.url ?? '',
    type: resource?.type ?? DEFAULT_TYPE,
    status: resource?.status ?? DEFAULT_STATUS,
    notes: resource?.notes ?? '',
    category: resource?.category ?? '',
    tags: resource?.tags ?? [],
  };
}

export default function ResourceForm({ resource, categories, tags, onSave, onCancel }) {
  const isEdit = !!resource;
  const [form, setForm] = useState(() => initialState(resource));
  const [typeTouched, setTypeTouched] = useState(isEdit);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const titleRef = useRef(null);
  const urlRef = useRef(null);
  const initial = useRef(JSON.stringify(initialState(resource)));

  useEffect(() => {
    if (!isEdit) titleRef.current?.focus();
  }, [isEdit]);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // Al escribir un enlace, sugiere el tipo (vídeo, web…) si no lo has elegido tú.
  const onUrlChange = (value) => {
    set('url', value);
    if (!typeTouched) {
      const parsed = parseUrlInput(value);
      const guess = parsed.url ? guessType(parsed.url) : null;
      setForm((f) => ({ ...f, type: guess ?? DEFAULT_TYPE }));
    }
  };

  const paste = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) onUrlChange(text);
      urlRef.current?.focus();
    } catch {
      urlRef.current?.focus();
    }
  };

  const dirty = JSON.stringify(form) !== initial.current;

  const submit = async (e) => {
    e?.preventDefault();
    if (saving) return;
    const parsed = parseUrlInput(form.url);
    const nextErrors = {};
    if (parsed.error) nextErrors.url = parsed.error;
    const title = form.title.trim() || (parsed.url ? titleFromUrl(parsed.url) : '');
    if (!title) nextErrors.title = 'Escribe un título (o pega un enlace y lo rellenamos por ti).';
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      (nextErrors.title ? titleRef : urlRef).current?.focus();
      return;
    }
    setSaving(true);
    const ok = await onSave({
      title,
      url: parsed.url,
      type: form.type,
      status: form.status,
      notes: form.notes,
      category: form.category.trim(),
      tags: cleanTags(form.tags),
    });
    if (!ok) setSaving(false);
  };

  const cancel = () => (dirty ? setConfirmDiscard(true) : onCancel());

  return (
    <div className="page page--form">
      <form onSubmit={submit} noValidate>
        <header className="form-head">
          <button type="button" className="btn btn--ghost btn--small" onClick={cancel}>Cancelar</button>
          <h1 className="form-head__title">{isEdit ? 'Editar recurso' : 'Nuevo recurso'}</h1>
          <button type="submit" className="btn btn--primary btn--small" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </header>

        <div className="form-body">
          <div className="field">
            <label className="field__label" htmlFor="f-title">Título</label>
            <input
              ref={titleRef}
              id="f-title"
              className="input input--title"
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              maxLength={LIMITS.title}
              placeholder="¿Qué quieres guardar?"
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? 'e-title' : undefined}
              enterKeyHint="next"
            />
            {errors.title && <p id="e-title" className="field__error">{errors.title}</p>}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="f-url">Enlace <span className="field__optional">opcional</span></label>
            <div className="input-with-action">
              <input
                ref={urlRef}
                id="f-url"
                className="input"
                type="url"
                inputMode="url"
                value={form.url}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder="https://"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={!!errors.url}
                aria-describedby={errors.url ? 'e-url' : undefined}
              />
              {canPaste && (
                <button type="button" className="btn btn--small" onClick={paste}>
                  <Icon name="paste" size={18} /> Pegar
                </button>
              )}
            </div>
            {errors.url && <p id="e-url" className="field__error">{errors.url}</p>}
          </div>

          <div className="field">
            <span className="field__label" id="l-type">Tipo</span>
            <ChipGroup
              name="type"
              label="Tipo"
              options={TYPES}
              value={form.type}
              onChange={(v) => {
                setTypeTouched(true);
                set('type', v);
              }}
            />
          </div>

          <div className="field">
            <span className="field__label">Estado</span>
            <ChipGroup name="status" label="Estado" options={STATUSES} value={form.status} onChange={(v) => set('status', v)} />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="f-notes">Descripción o notas <span className="field__optional">opcional</span></label>
            <textarea
              id="f-notes"
              className="input input--area"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              maxLength={LIMITS.notes}
              rows={4}
              placeholder="Por qué lo guardas, ideas clave, dónde aplicarlo…"
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="f-category">Categoría <span className="field__optional">opcional</span></label>
            <input
              id="f-category"
              className="input"
              type="text"
              list="category-options"
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              maxLength={LIMITS.category}
              placeholder="Ej.: Derecho digital"
            />
            <datalist id="category-options">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="f-tags">Etiquetas <span className="field__optional">opcional</span></label>
            <TagInput id="f-tags" value={form.tags} onChange={(v) => set('tags', v)} suggestions={tags} />
            <p className="field__hint">Separa con comas o pulsa Intro.</p>
          </div>

          <button type="submit" className="btn btn--primary btn--block btn--large" disabled={saving}>
            <Icon name="check" /> {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Guardar recurso'}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDiscard}
        title="¿Descartar los cambios?"
        message="Lo que has escrito no se guardará."
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
        danger
        onConfirm={onCancel}
        onCancel={() => setConfirmDiscard(false)}
      />
    </div>
  );
}
