import { useMemo, useRef, useState, useEffect } from 'react';
import { TYPES, STATUSES, typeLabel, statusInfo } from '../lib/model.js';
import {
  queryResources,
  activeFilterCount,
  EMPTY_FILTERS,
  SORTS,
  collectCategories,
  collectTags,
} from '../lib/search.js';
import { paths } from '../lib/route.js';
import ResourceRow from '../components/ResourceRow.jsx';
import ChipGroup from '../components/ChipGroup.jsx';
import Icon from '../components/Icon.jsx';

export default function LibraryView({ resources, view, setView, highlightId, backupReminder = null }) {
  const { query, filters, sort } = view;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchRef = useRef(null);

  const results = useMemo(() => queryResources(resources, view), [resources, view]);
  const categories = useMemo(() => collectCategories(resources), [resources]);
  const tags = useMemo(() => collectTags(resources), [resources]);
  const nFilters = activeFilterCount(filters);

  const setQuery = (q) => setView({ ...view, query: q });
  const setFilters = (f) => setView({ ...view, filters: f });
  const clearAll = () => setView({ ...view, query: '', filters: EMPTY_FILTERS });

  // Atajo de teclado en ordenador: «/» enfoca la búsqueda.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const activeChips = [
    filters.status && { key: 'status', label: statusInfo(filters.status).label, clear: { status: '' } },
    filters.type && { key: 'type', label: typeLabel(filters.type), clear: { type: '' } },
    filters.category && { key: 'category', label: filters.category, clear: { category: '' } },
    ...filters.tags.map((t) => ({ key: `tag-${t}`, label: `#${t}`, clear: { tags: filters.tags.filter((x) => x !== t) } })),
  ].filter(Boolean);

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="page-title">Almacén</h1>
        {resources.length > 0 && (
          <p className="page-sub">
            {resources.length === 1 ? '1 recurso guardado' : `${resources.length} recursos guardados`}
          </p>
        )}
      </header>

      {backupReminder}

      {resources.length === 0 ? (
        <div className="empty">
          <h2 className="empty__title">Tu almacén está vacío</h2>
          <p className="empty__text">
            Guarda el primer enlace, vídeo, idea o nota. Solo el título es obligatorio, así que tarda unos segundos.
          </p>
          <a className="btn btn--primary" href={paths.new}>
            <Icon name="plus" /> Añadir recurso
          </a>
          <a className="empty__secondary" href={paths.data}>¿Tienes una copia guardada? Impórtala</a>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <label className="search">
              <Icon name="search" className="search__icon" />
              <span className="sr-only">Buscar</span>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar en tu almacén"
                autoCapitalize="none"
                autoCorrect="off"
                enterKeyHint="search"
              />
              {query && (
                <button type="button" className="search__clear" aria-label="Borrar búsqueda" onClick={() => setQuery('')}>
                  <Icon name="close" size={16} />
                </button>
              )}
            </label>
            <div className="toolbar__row">
              <button
                type="button"
                className={`btn btn--small${nFilters ? ' btn--active' : ''}`}
                onClick={() => setFiltersOpen(true)}
                aria-haspopup="dialog"
              >
                <Icon name="filter" size={18} /> Filtros{nFilters ? ` (${nFilters})` : ''}
              </button>
              <label className="select">
                <span className="sr-only">Ordenar</span>
                <select value={sort} onChange={(e) => setView({ ...view, sort: e.target.value })}>
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </label>
            </div>
            {activeChips.length > 0 && (
              <div className="active-filters">
                {activeChips.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className="chip chip--removable is-on"
                    onClick={() => setFilters({ ...filters, ...c.clear })}
                    aria-label={`Quitar filtro ${c.label}`}
                  >
                    {c.label} <Icon name="close" size={14} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {(query || nFilters > 0) && (
            <p className="result-count" aria-live="polite">
              {results.length === 1 ? '1 resultado' : `${results.length} resultados`}
            </p>
          )}

          {results.length === 0 ? (
            <div className="empty empty--compact">
              <h2 className="empty__title">Nada coincide</h2>
              <p className="empty__text">
                {query ? `No hay recursos que contengan «${query}»` : 'Ningún recurso cumple estos filtros'}
                {query && nFilters ? ' con los filtros activos.' : '.'}
              </p>
              <button type="button" className="btn" onClick={clearAll}>Quitar búsqueda y filtros</button>
            </div>
          ) : (
            <ul className="list" aria-label="Recursos">
              {results.map((r) => (
                <ResourceRow key={r.id} resource={r} highlight={r.id === highlightId} />
              ))}
            </ul>
          )}
        </>
      )}

      {filtersOpen && (
        <FiltersSheet
          filters={filters}
          setFilters={setFilters}
          categories={categories}
          tags={tags}
          resultCount={results.length}
          onClose={() => setFiltersOpen(false)}
        />
      )}
    </div>
  );
}

function FiltersSheet({ filters, setFilters, categories, tags, resultCount, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="filters-title" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <h2 id="filters-title" className="sheet__title">Filtros</h2>
          <button type="button" className="btn btn--ghost btn--small" onClick={() => setFilters(EMPTY_FILTERS)}>
            Limpiar
          </button>
        </div>
        <div className="sheet__body">
          <section className="field">
            <h3 className="field__label">Estado</h3>
            <ChipGroup
              name="status"
              label="Estado"
              allLabel="Todos"
              options={STATUSES}
              value={filters.status}
              onChange={(v) => setFilters({ ...filters, status: v })}
            />
          </section>
          <section className="field">
            <h3 className="field__label">Tipo</h3>
            <ChipGroup
              name="type"
              label="Tipo"
              allLabel="Todos"
              options={TYPES}
              value={filters.type}
              onChange={(v) => setFilters({ ...filters, type: v })}
            />
          </section>
          <section className="field">
            <h3 className="field__label">Categoría</h3>
            {categories.length ? (
              <ChipGroup
                name="category"
                label="Categoría"
                allLabel="Todas"
                options={categories.map((c) => ({ value: c, label: c }))}
                value={filters.category}
                onChange={(v) => setFilters({ ...filters, category: v })}
              />
            ) : (
              <p className="field__hint">Aún no has asignado categorías.</p>
            )}
          </section>
          <section className="field">
            <h3 className="field__label">Etiquetas</h3>
            {tags.length ? (
              <>
                <ChipGroup
                  name="tags"
                  label="Etiquetas"
                  multiple
                  options={tags.map((t) => ({ value: t, label: `#${t}` }))}
                  value={filters.tags}
                  onChange={(v) => setFilters({ ...filters, tags: v })}
                />
                <p className="field__hint">Si eliges varias, se muestran los recursos que las tienen todas.</p>
              </>
            ) : (
              <p className="field__hint">Aún no has usado etiquetas.</p>
            )}
          </section>
        </div>
        <div className="sheet__foot">
          <button type="button" className="btn btn--primary btn--block" onClick={onClose}>
            {resultCount === 1 ? 'Ver 1 resultado' : `Ver ${resultCount} resultados`}
          </button>
        </div>
      </div>
    </div>
  );
}
