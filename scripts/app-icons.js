// App icons for the home screen and the browser tab: the rose gerbera from the Home meadow.
// One set of shapes produces the SVG favicon and the PNG icons, so they always match.
// Run `npm run icons` after changing the artwork; the generated files are committed under public/.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Colours from styles/tokens.css (--meadow-sky, --meadow-rose, --meadow-rose-inner, --meadow-disc, --meadow-sun).
const COLORS = { sky: '#fbe7ea', petal: '#f19bb0', petalEdge: '#dc7d96', inner: '#e57e98', disc: '#6b4a33', eye: '#f6d27a' };

// Launchers may crop a maskable icon to a circle 80 % of its width (radius 0.4 of the width).
export const MASKABLE_SAFE_RADIUS = 0.4;
// Share of the icon width reached by the outermost petal tip, per use.
const BLOOM_REACH = { any: 0.42, maskable: 0.34, favicon: 0.48 };
// The flower in its own units (as drawn on the Home page): petals reach 26 units from the centre.
const FLOWER_RADIUS = 26;

export const ICON_FILES = [
  { name: 'icon-192.png', size: 192, variant: 'any' },
  { name: 'icon-512.png', size: 512, variant: 'any' },
  { name: 'maskable-192.png', size: 192, variant: 'maskable' },
  { name: 'maskable-512.png', size: 512, variant: 'maskable' },
  { name: 'apple-touch-icon.png', size: 180, variant: 'any' },
];

// An ellipse of the flower, rotated `degrees` around the flower's centre like the Home page's SVG petals.
function petal(distance, rx, ry, degrees, color) {
  const angle = degrees * Math.PI / 180;
  return { x: distance * Math.sin(angle), y: -distance * Math.cos(angle), rx, ry, angle, color };
}

/** Shapes in drawing order, in unit coordinates (0–1 across the icon). `reach` is the distance from the centre. */
export function iconShapes({ variant = 'any', maskable = variant === 'maskable' } = {}) {
  const kind = maskable ? 'maskable' : variant;
  const scale = BLOOM_REACH[kind] / FLOWER_RADIUS;
  const flower = [
    ...Array.from({ length: 18 }, (_, i) => petal(15, 3.6, 11.5, i * 20, COLORS.petalEdge)),
    ...Array.from({ length: 18 }, (_, i) => petal(15, 3.1, 11, i * 20, COLORS.petal)),
    ...Array.from({ length: 12 }, (_, i) => petal(9, 2, 5.5, i * 30 + 15, COLORS.inner)),
    { x: 0, y: 0, rx: 6.5, ry: 6.5, angle: 0, color: COLORS.disc },
    { x: 0, y: 0, rx: 3.4, ry: 3.4, angle: 0, color: COLORS.eye },
  ].map(shape => ({
    kind: 'ellipse', color: shape.color, angle: shape.angle,
    cx: 0.5 + shape.x * scale, cy: 0.5 + shape.y * scale, rx: shape.rx * scale, ry: shape.ry * scale,
    reach: (Math.hypot(shape.x, shape.y) + Math.max(shape.rx, shape.ry)) * scale,
  }));
  return kind === 'favicon' ? flower : [{ kind: 'background', color: COLORS.sky, reach: Infinity }, ...flower];
}

const contains = (shape, x, y) => {
  if (shape.kind === 'background') return true;
  const dx = x - shape.cx, dy = y - shape.cy;
  const cos = Math.cos(-shape.angle), sin = Math.sin(-shape.angle);
  const u = dx * cos - dy * sin, v = dx * sin + dy * cos;
  return (u / shape.rx) ** 2 + (v / shape.ry) ** 2 <= 1;
};

const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

/** RGBA pixels with 4 × 4 supersampling for smooth edges. */
export function rasterize(shapes, size, samples = 4) {
  const pixels = new Uint8Array(size * size * 4);
  const colors = shapes.map(shape => rgb(shape.color));
  const top = shapes.length - 1;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = (px + (sx + 0.5) / samples) / size, y = (py + (sy + 0.5) / samples) / size;
          for (let i = top; i >= 0; i--) {
            if (!contains(shapes[i], x, y)) continue;
            r += colors[i][0]; g += colors[i][1]; b += colors[i][2]; a += 255;
            break;
          }
        }
      }
      const count = samples * samples, offset = (py * size + px) * 4;
      // Colour is averaged over covered samples only, so transparent edges keep their hue.
      const covered = a / 255 || 1;
      pixels[offset] = Math.round(r / covered); pixels[offset + 1] = Math.round(g / covered);
      pixels[offset + 2] = Math.round(b / covered); pixels[offset + 3] = Math.round(a / count);
    }
  }
  return pixels;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = bytes => {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'latin1');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** Encodes RGBA pixels as a PNG (8-bit, colour type 6). */
export function encodePng(pixels, size) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4);
  header[8] = 8; header[9] = 6;
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) Buffer.from(pixels.buffer, y * size * 4, size * 4).copy(rows, y * (size * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const number = value => Number(value.toFixed(2));

/** The same artwork as SVG (512 units wide). */
export function iconSvg(shapes) {
  const body = shapes.map(shape => shape.kind === 'background'
    ? `<rect width="512" height="512" fill="${shape.color}"/>`
    : `<ellipse cx="${number(shape.cx * 512)}" cy="${number(shape.cy * 512)}" rx="${number(shape.rx * 512)}" ry="${number(shape.ry * 512)}"${shape.angle ? ` transform="rotate(${number(shape.angle * 180 / Math.PI)} ${number(shape.cx * 512)} ${number(shape.cy * 512)})"` : ''} fill="${shape.color}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${body}</svg>\n`;
}

export function writeIcons(root = new URL('../public/', import.meta.url)) {
  const folder = new URL('icons/', root);
  mkdirSync(folder, { recursive: true });
  for (const { name, size, variant } of ICON_FILES) {
    writeFileSync(new URL(name, folder), encodePng(rasterize(iconShapes({ variant }), size), size));
  }
  writeFileSync(new URL('favicon.svg', root), iconSvg(iconShapes({ variant: 'favicon' })));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeIcons();
  console.log(`Wrote ${ICON_FILES.length} PNG icons and favicon.svg to ${fileURLToPath(new URL('../public/', import.meta.url))}`);
}
