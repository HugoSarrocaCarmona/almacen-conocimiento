// Junta la versión para claude.ai en una sola página: dist-claude/almacen.html.
// claude.ai añade por su cuenta <!doctype>, <head> y <body>, así que aquí solo
// va el contenido: título, estilos, el contenedor de la app y el código.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'dist-claude/assets';
const files = readdirSync(dir);
const read = (ext) =>
  files
    .filter((f) => f.endsWith(ext))
    .map((f) => readFileSync(join(dir, f), 'utf8'))
    .join('\n');

const css = read('.css').replace(/<\/style/gi, '<\\/style');
const js = read('.js').replace(/<\/script/gi, '<\\/script');

const html = `<title>Almacén de conocimiento</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="color-scheme" content="light dark">
<style>
${css}
/* claude.ai ya deja el hueco de la barra superior del iPhone. */
:root { --safe-top: 0px; }
</style>
<div id="root"></div>
<noscript>Activa JavaScript para usar Almacén de conocimiento.</noscript>
<script type="module">
${js}
</script>
`;

writeFileSync('dist-claude/almacen.html', html);
console.log(`dist-claude/almacen.html (${Math.round(html.length / 1024)} KB)`);
