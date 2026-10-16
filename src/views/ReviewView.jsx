import { useMemo, useState } from 'react';
import { STATUSES } from '../lib/model.js';
import { countByStatus, oldestPending, usefulOnes, randomSelection } from '../lib/review.js';
import { paths } from '../lib/route.js';
import ResourceRow from '../components/ResourceRow.jsx';
import StatusMark from '../components/StatusMark.jsx';
import Icon from '../components/Icon.jsx';

export default function ReviewView({ resources, onShowStatus }) {
  const [seed, setSeed] = useState(0);
  const counts = useMemo(() => countByStatus(resources), [resources]);
  const pending = useMemo(() => oldestPending(resources), [resources]);
  const useful = useMemo(() => usefulOnes(resources), [resources]);
  // `seed` solo sirve para pedir otra selección al pulsar el botón; la
  // selección no cambia cada vez que editas un recurso, solo si añades o borras.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const randomPick = useMemo(() => randomSelection(resources, 3), [resources.length, seed]);
  // Se muestran los datos actuales de los recursos elegidos (por si has editado alguno).
  const random = {
    onlyOld: randomPick.onlyOld,
    items: randomPick.items.map((r) => resources.find((x) => x.id === r.id)).filter(Boolean),
  };

  if (resources.length === 0) {
    return (
      <div className="page">
        <header className="page-head">
          <h1 className="page-title">Revisar</h1>
        </header>
        <div className="empty">
          <h2 className="empty__title">Nada que revisar todavía</h2>
          <p className="empty__text">
            Aquí verás lo que tienes pendiente de explorar, lo que te ha resultado útil y una selección de cosas que guardaste hace tiempo.
          </p>
          <a className="btn btn--primary" href={paths.new}><Icon name="plus" /> Añadir recurso</a>
        </div>
      </div>
    );
  }

  const usefulTotal = counts.util + counts.aplicado;

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="page-title">Revisar</h1>
        <p className="page-sub">Recupera lo que guardaste y decide qué te ha servido.</p>
      </header>

      <section className="review-block" aria-labelledby="r-status">
        <h2 id="r-status" className="section-title">Cómo está tu almacén</h2>
        <ul className="status-summary">
          {STATUSES.map((s) => (
            <li key={s.value}>
              <button type="button" className="status-summary__item" onClick={() => onShowStatus(s.value)}>
                <StatusMark status={s.value} />
                <span className="status-summary__label">{s.label}</span>
                <span className="status-summary__count">{counts[s.value]}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="review-block" aria-labelledby="r-random">
        <div className="section-head">
          <h2 id="r-random" className="section-title">Para retomar</h2>
          {resources.length > 3 && (
            <button type="button" className="btn btn--ghost btn--small" onClick={() => setSeed((s) => s + 1)}>
              <Icon name="shuffle" size={18} /> Otra selección
            </button>
          )}
        </div>
        <p className="section-note">
          {random.onlyOld
            ? 'Recursos al azar que guardaste hace más de una semana.'
            : 'Recursos al azar. Cuando lleves una semana usando la app, solo verás los más antiguos.'}
        </p>
        <ul className="list">
          {random.items.map((r) => <ResourceRow key={r.id} resource={r} />)}
        </ul>
      </section>

      <section className="review-block" aria-labelledby="r-pending">
        <div className="section-head">
          <h2 id="r-pending" className="section-title">Pendientes de explorar</h2>
          {counts.explorar > pending.length && (
            <button type="button" className="btn btn--ghost btn--small" onClick={() => onShowStatus('explorar')}>
              Ver los {counts.explorar}
            </button>
          )}
        </div>
        {pending.length ? (
          <>
            <p className="section-note">Los más antiguos primero. Ábrelos y márcalos como útiles, o elimínalos si ya no te interesan.</p>
            <ul className="list">{pending.map((r) => <ResourceRow key={r.id} resource={r} />)}</ul>
          </>
        ) : (
          <p className="section-note">No tienes nada pendiente. Todo lo guardado ya está explorado.</p>
        )}
      </section>

      <section className="review-block" aria-labelledby="r-useful">
        <div className="section-head">
          <h2 id="r-useful" className="section-title">Lo que te ha servido</h2>
          {usefulTotal > useful.length && (
            <button type="button" className="btn btn--ghost btn--small" onClick={() => onShowStatus('util')}>
              Ver útiles
            </button>
          )}
        </div>
        {useful.length ? (
          <ul className="list">{useful.map((r) => <ResourceRow key={r.id} resource={r} />)}</ul>
        ) : (
          <p className="section-note">Cuando marques algo como «útil» o «aplicado», aparecerá aquí.</p>
        )}
      </section>
    </div>
  );
}
