import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * Emite `sw.js` a partir de `src/sw.js`, inyectándole la lista de archivos
 * a precachear (bundle + public/) y un hash de su contenido como versión.
 * Reemplaza a vite-plugin-pwa/workbox con ~30 líneas y sin dependencias.
 */
function serviceWorker(): Plugin {
  let publicDir = '';
  return {
    name: 'presupuestos:service-worker',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      publicDir = config.publicDir;
    },
    generateBundle(_options, bundle) {
      const files = new Map<string, string | Uint8Array>();
      for (const [fileName, output] of Object.entries(bundle)) {
        if (fileName.endsWith('.map')) continue;
        files.set(fileName, output.type === 'chunk' ? output.code : output.source);
      }
      for (const path of listFiles(publicDir)) {
        files.set(relative(publicDir, path).split(sep).join('/'), readFileSync(path));
      }
      if (!files.has('index.html')) this.error('index.html no está en el bundle; revisar el orden de plugins.');

      const names = [...files.keys()].sort();
      const hash = createHash('sha256');
      for (const name of names) hash.update(name).update(files.get(name) ?? '');
      const precache = { version: hash.digest('hex').slice(0, 12), urls: ['./', ...names.map((n) => `./${n}`)] };

      const template = readFileSync('src/sw.js', 'utf8');
      const marker = 'self.__PRECACHE__';
      if (template.split(marker).length !== 2) this.error(`src/sw.js debe tener ${marker} exactamente una vez.`);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: template.replace(marker, JSON.stringify(precache)) });
    },
  };
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

export default defineConfig({
  // Rutas relativas: funciona igual en la raíz de un dominio o en
  // usuario.github.io/presupuestos_elec/.
  base: './',
  plugins: [serviceWorker()],
  build: {
    rollupOptions: {
      // jsPDF importa estos módulos solo para doc.html() y SVG, que no usamos.
      // Marcarlos externos evita meter ~500 KB de chunks que nunca se cargan.
      external: ['html2canvas', 'dompurify', 'canvg'],
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
