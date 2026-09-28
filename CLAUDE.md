# CLAUDE.md — Presupuestador Electricidad Domiciliaria

Contexto persistente del proyecto. Leer antes de escribir código.

## Qué es
Calculadora de presupuestos para un electricista domiciliario (La Plata y
alrededores). El electricista arma un presupuesto seleccionando servicios y
cantidades, y obtiene un total y un texto listo para mandar por WhatsApp.

## Para quién y dónde se usa
- Usuario único: el electricista (dueño de la app).
- Uso principal: en el celular, en la obra o casa del cliente.
- Puede haber mala o nula señal → **debe funcionar offline** (PWA).
- Rapidez > features: cargar un presupuesto de 10 ítems tiene que llevar segundos.

## Stack
- TypeScript + Vite. Sin framework de UI (ni React ni Vue): DOM + un store propio simple.
- CSS a mano, mobile-first. Sin librerías de componentes.
- Sin backend. Todo client-side.
- PWA: manifest + service worker (offline). Instalable en Android/iOS.
- Persistencia: `localStorage` (siempre con try/catch).
- Deploy: hosting estático (GitHub Pages o Netlify).

Única dependencia extra permitida: **jsPDF** (generación de PDF client-side,
bundleada para que funcione offline). Cualquier otra dependencia fuera del stack
hay que justificarla en el commit.

## Fuente de datos
El catálogo de precios vive en `public/lista-precios.csv`. Es la fuente de verdad
de los precios por defecto. El usuario lo edita y redeploya cuando cambian los precios.

Esquema del CSV (header exacto):
```
categoria,servicio,unidad,variante,precio
```
- `categoria`: agrupador visual (ej. "Tableros y protecciones").
- `servicio`: nombre del servicio.
- `unidad`: etiqueta de la unidad (`visita`, `hora`, `recargo`, `boca`, `ud`, `trabajo`, `tablero`, `modulo`). Es solo una etiqueta que se muestra al lado del precio; el cálculo siempre es `cantidad × precio`.
- `variante`: `embutido`, `exterior`, o vacío.
- `precio`: entero en pesos (ARS), sin separadores.

### Regla de agrupación (importante)
Al cargar el CSV, **agrupar por `(categoria, servicio, unidad)`**:
- Si un servicio aparece con dos variantes (`embutido` y `exterior`), es **una sola
  tarjeta** con un toggle embutido/exterior. El precio mostrado y el que suma al
  total es el de la variante elegida.
- Si la variante está vacía, es una tarjeta simple sin toggle.

## Reglas de negocio
- **Todos los precios son mano de obra.** Los materiales van aparte. El texto del
  presupuesto siempre debe aclararlo.
- `embutido` = cañería/gabinete embutido en la pared (más trabajo). `exterior` = a
  la vista / de aplicar (menos trabajo). Nunca mezclar: el usuario elige por ítem.
- "Recargo urgencia noche finde feriado" es un ítem más; se agrega con cantidad 1
  cuando corresponde. No requiere lógica especial.
- "Visita + diagnóstico + presupuesto" es bonificable si el cliente toma el trabajo.
  Modelarlo como ítem normal; un checkbox opcional "bonificar visita" que la reste
  es un nice-to-have, no un requisito.

## Presupuesto: texto y PDF
El presupuesto se puede entregar de dos formas, ambas offline:
- **Texto WhatsApp**: copia al portapapeles, con formato de asteriscos de WhatsApp.
- **PDF**: genera un archivo con jsPDF (encabezado con nombre del negocio y contacto,
  fecha, cliente opcional, tabla de ítems, total destacado, pie con la aclaración de
  mano de obra). Botón "Descargar PDF" y, si el dispositivo lo soporta, "Compartir"
  vía Web Share API (`navigator.canShare` con archivos) para mandarlo directo a
  WhatsApp; fallback a descarga.
- Datos del negocio (nombre, WhatsApp) son constantes configurables en un solo lugar
  del código, fáciles de editar.

## Formato y locale
- Moneda: `Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS', maximumFractionDigits:0 })`.
- Números tabulares en toda cifra de dinero (`font-variant-numeric: tabular-nums`).
- Idioma de la interfaz: español (Argentina).

## Persistencia
- Defaults de precios: del CSV.
- El usuario puede **editar un precio inline**; el cambio se guarda como override en
  `localStorage`, sin tocar el CSV. Un botón "restaurar precios" borra los overrides.
- Cantidades del presupuesto en curso también persisten (para no perder trabajo si
  cierra la app). "Nuevo presupuesto" limpia cantidades pero conserva precios.
- Toda lectura/escritura de `localStorage` va con try/catch y funciona si vuelve vacío.

## Marca / estética
- Paleta negro + amarillo (identidad ya usada por el usuario en su flyer):
  fondo grafito casi negro, acento amarillo señal, texto hueso.
- Tono industrial/instrumento, legible al sol. Nada de degradés decorativos ni
  tarjetas redondeadas genéricas. El acento amarillo se usa con moderación (total,
  acción principal), no en todos lados.

## No-objetivos (fuera de alcance)
- Sin cuentas de usuario, login ni multi-usuario.
- Sin backend ni base de datos remota.
- Sin catálogo de materiales (la app es solo mano de obra).
- Sin pagos.
- Sin generación de PDF en servidor (el PDF se arma en el navegador, offline).

## Comandos
- `npm run dev` — desarrollo.
- `npm run build` — build de producción.
- `npm run preview` — servir el build.
- `npm run test` — tests (Vitest).

## Convenciones de código
- TypeScript estricto (`strict: true`). Sin `any` salvo justificado.
- Lógica de cálculo (totales, generación del texto) **pura y testeada**, separada
  del DOM.
- Nombres en inglés en el código; textos de UI en español.
- Funciones chicas, sin estado global implícito fuera del store.

## Definition of done
- Compila sin errores de tipos.
- Tests de la lógica de cálculo y del generador de texto en verde.
- Funciona offline tras la primera carga (service worker activo).
- Instalable como PWA en el celular.
- Responsive real en pantalla de teléfono, con safe-area insets respetados.
- El texto de WhatsApp se copia al portapapeles con un toque.
- Genera y descarga/comparte un PDF del presupuesto, funcionando offline.
