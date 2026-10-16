// Utilidades para enlaces. No se conecta a internet: solo analiza el texto.

const VIDEO_HOSTS = ['youtube.com', 'youtu.be', 'vimeo.com', 'tiktok.com', 'twitch.tv', 'dailymotion.com'];
const DOC_EXT = /\.(pdf|docx?|xlsx?|pptx?|odt|rtf|epub)$/i;

// Convierte lo que escribe el usuario en una URL válida.
// Devuelve { url } si es válida, { url: '' } si está vacía o { error } si no lo es.
export function parseUrlInput(input) {
  const text = (input ?? '').trim();
  if (!text) return { url: '' };
  if (/\s/.test(text)) return { error: 'El enlace no puede contener espacios.' };
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      if (!u.hostname.includes('.') && u.hostname !== 'localhost') {
        return { error: 'El enlace no parece válido. Ejemplo: https://ejemplo.com' };
      }
    }
    return { url: u.href };
  } catch {
    return { error: 'El enlace no parece válido. Ejemplo: https://ejemplo.com' };
  }
}

export function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Sugiere un tipo a partir del enlace (solo mirando el texto).
export function guessType(url) {
  if (!url) return null;
  const host = hostOf(url);
  if (VIDEO_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return 'video';
  try {
    if (DOC_EXT.test(new URL(url).pathname)) return 'documento';
  } catch {
    return null;
  }
  return 'web';
}

// Partes de una dirección que no dicen nada del contenido.
const GENERIC_SEGMENTS = new Set(['watch', 'index', 'view', 'video', 'videos', 'v', 'p', 'post', 'status', 'reel', 'shorts', 'embed', 'home']);

// Título provisional cuando el usuario solo pega un enlace.
export function titleFromUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    let last = '';
    try {
      last = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() ?? '');
    } catch {
      last = '';
    }
    last = last.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[-_]+/g, ' ').trim();
    const meaningful = last && !/^\d+$/.test(last) && !GENERIC_SEGMENTS.has(last.toLowerCase()) && last.length > 2;
    if (meaningful) return `${last} (${host})`;
    if (guessType(url) === 'video') return `Vídeo de ${host}`;
    return host ? `Enlace de ${host}` : url;
  } catch {
    return url;
  }
}

// Clave para detectar el mismo enlace aunque cambie el formato.
export function urlKey(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    const path = u.pathname.replace(/\/+$/, '');
    const params = [...u.searchParams.entries()]
      .filter(([k]) => !/^utm_|^fbclid$|^gclid$|^si$/i.test(k))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return `${host}${path}${params ? `?${params}` : ''}`;
  } catch {
    return url.trim().toLowerCase();
  }
}
