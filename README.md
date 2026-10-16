# Almacén de conocimiento

Biblioteca personal para guardar, organizar y recuperar enlaces, vídeos, artículos, ideas, notas y documentos. Está pensada sobre todo para el iPhone, aunque también funciona en el ordenador.

- Sin cuentas, sin servidor y sin servicios de pago.
- Los datos se guardan en tu navegador (IndexedDB), y puedes exportarlos e importarlos en JSON.
- Se instala en la pantalla de inicio del iPhone (PWA) y se abre sin conexión.

**App publicada:** https://hugosarrocacarmona.github.io/almacen-conocimiento/ (se actualiza sola con cada cambio que se sube a `main`).

## Comandos

Hacen falta [Node.js](https://nodejs.org) 18 o superior.

```bash
npm install        # solo la primera vez
npm run dev        # abre la app en modo desarrollo (http://localhost:5173)
npm test           # ejecuta las pruebas automáticas
npm run build      # genera la versión final en la carpeta dist/
npm run preview    # sirve dist/ para probarla (http://localhost:4173)
```

`dev` y `preview` también muestran una dirección de la red local (`http://192.168.x.x:…`) para abrirla desde el iPhone si está en la misma wifi. Sirve para probar, pero no para instalarla de forma definitiva (más abajo se explica por qué).

## Usarla en el iPhone de forma definitiva

Necesitas publicar la carpeta `dist/` en una web con **https**. Hay dos formas gratuitas:

**Opción A: Netlify Drop (la más sencilla, sin terminal)**
1. Ejecuta `npm run build`.
2. Entra en https://app.netlify.com/drop y arrastra la carpeta `dist`.
3. Crea una cuenta gratuita para que la web no se borre y, si quieres, cámbiale el nombre.
4. Para actualizarla: vuelve a compilar y arrastra la carpeta `dist` en la sección «Deploys» del sitio.

**Opción B: GitHub Pages (se actualiza sola)**
1. Sube el proyecto a un repositorio de GitHub (rama `main`).
2. En el repositorio, ve a Settings → Pages → Source y elige «GitHub Actions».
3. A partir de ahí, cada vez que subas cambios, `.github/workflows/deploy.yml` ejecuta las pruebas y publica la app en `https://TU-USUARIO.github.io/NOMBRE-REPO/`.

**Instalarla en el iPhone**
1. Abre la dirección https en **Safari**.
2. Pulsa Compartir → «Añadir a pantalla de inicio» → Añadir.
3. Ábrela siempre desde ese icono. Ojo: Safari y la app instalada guardan los datos por separado.

## Tus datos

- Viven solo en el navegador o la app instalada de cada dispositivo. No hay sincronización.
- **Copias → Guardar copia en Archivos o iCloud** (en el iPhone) o **Descargar copia** crea un archivo JSON.
- **Copias → Elegir archivo** importa una copia. Antes de cambiar nada verás qué contiene y podrás:
  - **Combinar**: añade lo nuevo y actualiza lo que tenga una versión más reciente, sin duplicar (compara por identificador, enlace y título con notas).
  - **Sustituir**: deja solo lo que hay en la copia (te pide confirmación).
- Si llevas 14 días sin exportar y tienes 5 recursos o más, la biblioteca te lo recuerda (sin notificaciones).
- Borrar los datos de navegación de Safari, o desinstalar la app, borra la biblioteca. Exporta antes.

## Estructura

```
src/
  App.jsx               Estado global, acciones (guardar, borrar, importar) y pantallas
  main.jsx              Punto de entrada
  styles.css            Todo el diseño (móvil primero, modo oscuro)
  data/storage.js       Única pieza que sabe dónde se guardan los datos (IndexedDB)
  lib/model.js          Forma de un recurso, tipos, estados y validación
  lib/search.js         Búsqueda sin tildes, filtros y ordenación
  lib/backup.js         Exportar, validar e importar copias
  lib/review.js         Lógica de la sección Revisar
  lib/url.js            Validar enlaces y sugerir tipo y título
  lib/route.js          Navegación con #/ (funciona con el botón Atrás)
  lib/pwa.js            Registro del service worker
  views/                Biblioteca, Formulario, Detalle, Revisar y Copias
  components/           Piezas reutilizables (filas, chips, etiquetas, avisos, iconos)
public/
  manifest.webmanifest  Datos para instalarla como app
  sw.js                 Service worker: permite abrirla sin conexión
  icons/                Iconos (se generan con scripts/make-icons.py)
```

Pensado para crecer: si en el futuro quieres sincronizar en la nube, solo hay que cambiar `data/storage.js`, y las funciones nuevas (resúmenes, extracción de enlaces) pueden añadirse sobre el mismo modelo de datos.
