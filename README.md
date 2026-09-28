# Presupuestador · Electricidad Domiciliaria

PWA para armar presupuestos de mano de obra eléctrica desde el celular: elegís
servicios y cantidades, y obtenés el total, un texto listo para WhatsApp y un PDF.
Funciona sin conexión después de la primera carga y se puede instalar en la
pantalla de inicio.

Contexto y reglas del proyecto: [`CLAUDE.md`](CLAUDE.md).

## Comandos

Requiere Node 22.12 o superior.

```bash
npm install
npm run dev       # desarrollo en http://localhost:5173
npm run test      # tests (Vitest)
npm run build     # chequeo de tipos + build de producción en dist/
npm run preview   # sirve dist/ (acá sí se activa el service worker)
npm run icons     # regenera public/icons/ (solo si cambiás el ícono)
```

## Qué se edita a mano

- **Precios**: `public/lista-precios.csv` (header `categoria,servicio,unidad,variante,precio`,
  precio entero sin separadores). Un servicio con filas `embutido` y `exterior` se
  muestra como una sola tarjeta con toggle. Al redeployar, la app instalada se
  actualiza sola en la próxima apertura.
- **Datos del negocio** (nombre, WhatsApp, zona, validez): `src/config.ts`.

Los precios editados desde la app se guardan solo en ese teléfono
(`localStorage`); "Restaurar precios" vuelve a los del CSV.

## Deploy a GitHub Pages

El repo trae un workflow (`.github/workflows/deploy.yml`) que corre los tests,
hace el build y publica `dist/` en cada push a `master`.

1. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Hacé push a `master` (o corré el workflow a mano desde la pestaña **Actions**).
3. La app queda en `https://<usuario>.github.io/presupuestos_elec/`.
4. En el celular, abrila en Chrome (Android) o Safari (iOS) y elegí
   **Instalar app** / **Agregar a pantalla de inicio**.

El build usa rutas relativas, así que funciona igual en un subdirectorio de
GitHub Pages o en la raíz de otro hosting estático (Netlify: build `npm run build`,
carpeta `dist`).

## Estructura

```
public/            CSV de precios, manifest e íconos (se copian tal cual)
src/domain/        lógica pura y testeada: CSV → catálogo, totales, texto WhatsApp
src/state/         estado inmutable, transiciones y persistencia en localStorage
src/ui/            DOM: filas, barra de total, portapapeles, avisos
src/pdf/           PDF con jsPDF y compartir/descargar
src/sw.js          service worker (el build le inyecta la lista de archivos)
tests/             Vitest
```
