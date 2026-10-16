// Navegación mínima basada en el «#» de la dirección. Permite usar el botón
// Atrás del navegador y abrir un recurso con un enlace directo.
import { useEffect, useState } from 'react';

export function parseHash(hash) {
  const path = (hash || '').replace(/^#/, '') || '/';
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'library' };
  if (parts[0] === 'nuevo') return { name: 'new' };
  if (parts[0] === 'revisar') return { name: 'review' };
  if (parts[0] === 'datos') return { name: 'data' };
  if (parts[0] === 'r' && parts[1]) {
    const id = decodeURIComponent(parts[1]);
    return parts[2] === 'editar' ? { name: 'edit', id } : { name: 'detail', id };
  }
  return { name: 'library' };
}

export const paths = {
  library: '#/',
  new: '#/nuevo',
  review: '#/revisar',
  data: '#/datos',
  detail: (id) => `#/r/${encodeURIComponent(id)}`,
  edit: (id) => `#/r/${encodeURIComponent(id)}/editar`,
};

// `replace` evita que el botón Atrás vuelva a un formulario ya guardado.
export function navigate(hash, { replace = false } = {}) {
  if (replace) {
    history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = hash;
  }
}

export function useRoute() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
