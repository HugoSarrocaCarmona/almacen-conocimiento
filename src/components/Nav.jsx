import { paths } from '../lib/route.js';
import Icon from './Icon.jsx';

const LINKS = [
  { name: 'library', href: paths.library, label: 'Biblioteca', icon: 'library' },
  { name: 'review', href: paths.review, label: 'Revisar', icon: 'review' },
  { name: 'data', href: paths.data, label: 'Copias', icon: 'data' },
];

// En el móvil es una barra inferior con el botón «Añadir» en el centro.
// En el ordenador se convierte en una barra superior.
export default function Nav({ route, hidden }) {
  const current = route.name === 'detail' ? 'library' : route.name;
  if (hidden) return null;
  return (
    <nav className="nav" aria-label="Secciones">
      <a className="nav__brand" href={paths.library}>Almacén</a>
      <div className="nav__links">
        {LINKS.slice(0, 2).map((l) => (
          <NavLink key={l.name} link={l} active={current === l.name} />
        ))}
        <a className="nav__add" href={paths.new} aria-label="Añadir recurso">
          <Icon name="plus" size={26} strokeWidth={2.2} />
          <span className="nav__add-label">Añadir</span>
        </a>
        <NavLink link={LINKS[2]} active={current === 'data'} />
      </div>
    </nav>
  );
}

function NavLink({ link, active }) {
  return (
    <a className={`nav__link${active ? ' is-active' : ''}`} href={link.href} aria-current={active ? 'page' : undefined}>
      <Icon name={link.icon} size={22} />
      <span>{link.label}</span>
    </a>
  );
}
