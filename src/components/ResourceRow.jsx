import { typeLabel } from '../lib/model.js';
import { hostOf } from '../lib/url.js';
import { paths } from '../lib/route.js';
import StatusMark from './StatusMark.jsx';

export default function ResourceRow({ resource, highlight = false }) {
  const host = resource.url ? hostOf(resource.url) : '';
  return (
    <li className={`row${highlight ? ' row--new' : ''}`}>
      <a className="row__link" href={paths.detail(resource.id)}>
        <span className="row__main">
          <span className="row__title">{resource.title}</span>
          <span className="row__meta">
            <span className="row__type">{typeLabel(resource.type)}</span>
            {resource.category && <span className="row__category">{resource.category}</span>}
            {host && <span className="row__host">{host}</span>}
          </span>
          {resource.tags.length > 0 && (
            <span className="row__tags">
              {resource.tags.slice(0, 4).map((t) => (
                <span key={t} className="tag">#{t}</span>
              ))}
              {resource.tags.length > 4 && <span className="tag tag--more">+{resource.tags.length - 4}</span>}
            </span>
          )}
        </span>
        <StatusMark status={resource.status} showLabel size="sm" />
      </a>
    </li>
  );
}
