import { statusInfo } from '../lib/model.js';

// Tres barras que se llenan según el estado: por explorar (1), útil (2), aplicado (3).
export default function StatusMark({ status, showLabel = false, size = 'md' }) {
  const info = statusInfo(status);
  return (
    <span className={`status status--${info.value} status--${size}`} title={info.label}>
      <span className="status__bars" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className={n <= info.level ? 'is-on' : ''} />
        ))}
      </span>
      {showLabel ? <span className="status__label">{info.label}</span> : <span className="sr-only">{info.label}</span>}
    </span>
  );
}
