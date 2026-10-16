import { useState } from 'react';
import { cleanTag, LIMITS } from '../lib/model.js';
import { normalizeText } from '../lib/search.js';
import Icon from './Icon.jsx';

// Campo de etiquetas: escribe y pulsa coma o Intro para añadir.
// Sugiere etiquetas que ya usas para no crear variantes.
export default function TagInput({ id, value, onChange, suggestions = [] }) {
  const [draft, setDraft] = useState('');

  const add = (raw) => {
    const parts = raw.split(',').map(cleanTag).filter(Boolean);
    if (parts.length === 0) return;
    const next = [...value];
    for (const p of parts) if (!next.includes(p) && next.length < LIMITS.tags) next.push(p);
    onChange(next);
  };

  const commitDraft = () => {
    if (draft.trim()) add(draft);
    setDraft('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitDraft();
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const onInput = (e) => {
    const text = e.target.value;
    // En el teclado del iPhone la coma no siempre dispara keydown.
    if (text.includes(',')) {
      add(text);
      setDraft('');
    } else setDraft(text);
  };

  const q = normalizeText(draft.trim());
  const shown = suggestions
    .filter((s) => !value.includes(s) && (!q || normalizeText(s).includes(q)))
    .slice(0, 6);

  return (
    <div className="tag-input">
      <div className="tag-input__box">
        {value.map((t) => (
          <span key={t} className="tag tag--editable">
            #{t}
            <button type="button" aria-label={`Quitar etiqueta ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}>
              <Icon name="close" size={14} />
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={draft}
          onChange={onInput}
          onKeyDown={onKeyDown}
          onBlur={commitDraft}
          placeholder={value.length ? 'Añadir otra…' : 'derecho, ia, productividad…'}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
        />
      </div>
      {shown.length > 0 && (
        <div className="tag-input__suggest" aria-label="Etiquetas que ya usas">
          {shown.map((s) => (
            <button
              key={s}
              type="button"
              className="tag tag--suggest"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                add(s);
                setDraft('');
              }}
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
