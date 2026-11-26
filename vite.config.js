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

// Versión para claude.ai (`npm run build:claude`): cambia el almacenamiento
// local por la base de datos de claude.ai. El resto de la app es igual.
function useCloudStorage() {
  const cloud = resolve('src/data/storage-cloud.js');
  return {
    name: 'use-cloud-storage',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!source.endsWith('/data/storage.js')) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      return resolved && resolved.id.endsWith('/src/data/storage.js') ? cloud : null;
    },
  };
}

// base './' hace que la app funcione en cualquier carpeta del servidor
// (por ejemplo, GitHub Pages en usuario.github.io/almacen/).
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'artifact' ? [react(), useCloudStorage()] : [react(), stampServiceWorker()],
  build:
    mode === 'artifact'
      ? {
          target: 'es2020',
          outDir: 'dist-claude',
          emptyOutDir: true,
          copyPublicDir: false,
          cssCodeSplit: false,
          rollupOptions: { output: { inlineDynamicImports: true } },
        }
      : { target: 'es2020' },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
}));
