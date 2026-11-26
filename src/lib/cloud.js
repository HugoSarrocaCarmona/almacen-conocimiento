// ¿Se está ejecutando la versión publicada en claude.ai?
// Se decide al compilar: `npm run build:claude` usa el modo «artifact».
export const IS_CLOUD = import.meta.env.MODE === 'artifact';

// En claude.ai la página no puede descargar archivos por sí sola: se pide
// al visor con la capacidad `downloads`. Devuelve true si se ha guardado.
export async function saveFileFromClaude(filename, data) {
  const downloads = await window.claude?.use?.('downloads');
  if (!downloads) throw new Error('Este visor no permite guardar archivos.');
  await downloads.save({ filename, data });
  return true;
}
