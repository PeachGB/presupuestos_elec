// Genera los íconos de la PWA (rayo amarillo sobre grafito) sin dependencias:
// rasteriza el polígono con supersampling y codifica PNG con zlib de Node.
// Uso: npm run icons  (los archivos generados se versionan en public/icons/)
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const OUT = new URL('../public/icons/', import.meta.url);
const BG = [0x14, 0x14, 0x14];
const FG = [0xff, 0xc7, 0x00];
// Mismo rayo que src/pdf/quotePdf.ts e index.html, en una grilla de 64×64 centrada en (32, 32).
const BOLT = [
  [38, 4],
  [14, 36],
  [30, 36],
  [24, 60],
  [50, 26],
  [34, 26],
];
const BOLT_PATH = 'M38 4 14 36h16l-6 24 26-34H34z';

const TARGETS = [
  // [archivo, lado en px, escala del rayo]. Maskable: el rayo entra en la zona segura (círculo del 80%).
  ['icon-192.png', 192, 0.8],
  ['icon-512.png', 512, 0.8],
  ['icon-maskable-512.png', 512, 0.62],
  ['apple-touch-icon.png', 180, 0.72],
];

function insidePolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function rasterize(size, scale, samples = 4) {
  const poly = BOLT.map(([x, y]) => [(0.5 + ((x - 32) / 64) * scale) * size, (0.5 + ((y - 32) / 64) * scale) * size]);
  const stride = size * 3 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let py = 0; py < size; py++) {
    raw[py * stride] = 0; // filtro PNG "None"
    for (let px = 0; px < size; px++) {
      let hits = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          if (insidePolygon(px + (sx + 0.5) / samples, py + (sy + 0.5) / samples, poly)) hits++;
        }
      }
      const a = hits / (samples * samples);
      const o = py * stride + 1 + px * 3;
      for (let c = 0; c < 3; c++) raw[o + c] = Math.round(BG[c] + (FG[c] - BG[c]) * a);
    }
  }
  return raw;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const hex = (rgb) => `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${hex(BG)}"/>
  <path d="${BOLT_PATH}" fill="${hex(FG)}" transform="translate(32 32) scale(0.8) translate(-32 -32)"/>
</svg>
`;

mkdirSync(OUT, { recursive: true });
writeFileSync(new URL('icon.svg', OUT), svg);
for (const [file, size, scale] of TARGETS) {
  writeFileSync(new URL(file, OUT), encodePng(size, rasterize(size, scale)));
  console.log(`public/icons/${file} (${size}×${size})`);
}
