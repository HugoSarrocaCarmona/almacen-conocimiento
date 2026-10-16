import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Pone un identificador único en el service worker en cada compilación,
// para que el iPhone descargue la versión nueva cuando actualices la app.
function stampServiceWorker() {
  let outDir = 'dist';
  return {
    name: 'stamp-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const file = resolve(outDir, 'sw.js');
      if (!existsSync(file)) return;
      const id = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
      writeFileSync(file, readFileSync(file, 'utf8').replace('__BUILD_ID__', id));
    },
  };
}

// base './' hace que la app funcione en cualquier carpeta del servidor
// (por ejemplo, GitHub Pages en usuario.github.io/almacen/).
export default defineConfig({
  base: './',
  plugins: [react(), stampServiceWorker()],
  build: { target: 'es2020' },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
