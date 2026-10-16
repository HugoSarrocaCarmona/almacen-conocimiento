import { useState } from 'react';
import { STATUSES, typeLabel } from '../lib/model.js';
import { hostOf } from '../lib/url.js';
import { paths } from '../lib/route.js';
import { formatDate } from '../lib/format.js';
import ChipGroup from '../components/ChipGroup.jsx';
import Icon from '../components/Icon.jsx';
import { ConfirmDialog } from '../components/Feedback.jsx';

export default function ResourceDetail({ resource, onStatusChange, onDelete, onFilterTag, onFilterCategory }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!resource) {
    return (
      <div className="page">
        <div className="empty">
          <h1 className="empty__title">Este recurso ya no existe</h1>
          <p className="empty__text">Puede que lo hayas eliminado o que el enlace sea de otro dispositivo.</p>
          <a className="btn btn--primary" href={paths.library}>Ir a la biblioteca</a>
        </div>
      </div>
    );
  }

  const host = resource.url ? hostOf(resource.url) : '';
  const edited = resource.updatedAt !== resource.createdAt;

  return (
    <div className="page page--detail">
      <header className="detail-head">
        <a className="btn btn--ghost btn--small" href={paths.library}>
          <Icon name="back" size={18} /> Biblioteca
        </a>
        <a className="btn btn--small" href={paths.edit(resource.id)}>
          <Icon name="edit" size={18} /> Editar
        </a>
      </header>

      <article className="detail">
        <p className="detail__kicker">
          <span>{typeLabel(resource.type)}</span>
          {resource.category && (
            <button type="button" className="link-button" onClick={() => onFilterCategory(resource.category)}>
              {resource.category}
            </button>
          )}
        </p>
        <h1 className="detail__title">{resource.title}</h1>

        {resource.url && (
          <a className="detail__url" href={resource.url} target="_blank" rel="noopener noreferrer">
            <span className="detail__url-text">
              <span className="detail__host">{host || resource.url}</span>
              <span className="detail__full-url">{resource.url}</span>
            </span>
            <Icon name="external" size={18} />
          </a>
        )}

        <section className="detail__section">
          <h2 className="detail__label">Estado</h2>
          <ChipGroup
            name="status"
            label="Estado"
            options={STATUSES}
            value={resource.status}
            onChange={(v) => v !== resource.status && onStatusChange(resource, v)}
          />
        </section>

        {resource.notes && (
          <section className="detail__section">
            <h2 className="detail__label">Notas</h2>
            <p className="detail__notes">{resource.notes}</p>
          </section>
        )}

        {resource.tags.length > 0 && (
          <section className="detail__section">
            <h2 className="detail__label">Etiquetas</h2>
            <div className="detail__tags">
              {resource.tags.map((t) => (
                <button key={t} type="button" className="tag tag--button" onClick={() => onFilterTag(t)}>
                  #{t}
                </button>
              ))}
            </div>
          </section>
        )}

        <p className="detail__dates">
          Guardado el {formatDate(resource.createdAt)}
          {edited && <><br />Modificado el {formatDate(resource.updatedAt)}</>}
        </p>

        <button type="button" className="btn btn--danger-ghost btn--block" onClick={() => setConfirmDelete(true)}>
          <Icon name="trash" size={18} /> Eliminar recurso
        </button>
      </article>

      <ConfirmDialog
        open={confirmDelete}
        title="¿Eliminar este recurso?"
        message={`«${resource.title}» se borrará de este dispositivo. Podrás deshacerlo durante unos segundos.`}
        confirmLabel="Eliminar"
        danger
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete(resource);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
