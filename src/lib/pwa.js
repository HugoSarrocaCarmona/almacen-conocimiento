// Registra el service worker, que permite abrir la app sin conexión.
// Solo funciona en https (o localhost); en otros casos la app sigue
// funcionando igual, simplemente necesita conexión para cargarse.
export function registerServiceWorker() {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* sin modo sin conexión; la app sigue funcionando */
    });
  });
}

// En iPhone, ¿se ha abierto desde la pantalla de inicio?
export function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
}

export function isIOS() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}
