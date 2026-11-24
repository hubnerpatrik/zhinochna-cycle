import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { ICON_FILES, iconShapes, MASKABLE_SAFE_RADIUS } from '../scripts/app-icons.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url));
const html = read('index.html').toString();
const manifest = JSON.parse(read('public/manifest.webmanifest'));

function pngSize(bytes) {
  assert.equal(bytes.subarray(1, 4).toString('latin1'), 'PNG');
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

test('the page links a web app manifest, theme colour and home-screen icons', () => {
  assert.match(html, /<link\s+rel="manifest"\s+href="\/manifest\.webmanifest"/);
  const theme = html.match(/<meta\s+name="theme-color"\s+content="(#[0-9a-f]{6})"/i);
  assert.ok(theme, 'theme-color meta');
  assert.equal(theme[1].toLowerCase(), manifest.theme_color.toLowerCase());
  assert.match(html, /<link\s+rel="icon"\s+href="\/favicon\.svg"\s+type="image\/svg\+xml"/);
  assert.match(html, /<link\s+rel="apple-touch-icon"\s+href="\/icons\/apple-touch-icon\.png"/);
});

test('the manifest meets Android install requirements and opens as a standalone app', () => {
  assert.equal(manifest.name, 'Cycle Tracker');
  assert.ok(manifest.short_name && manifest.short_name.length <= 12, 'short name fits under a home-screen icon');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.id, '/');
  assert.equal(manifest.display, 'standalone');
  assert.match(manifest.background_color, /^#[0-9a-f]{6}$/i);
  const icon = (size, purpose) => manifest.icons.find(item => item.sizes === `${size}x${size}` && item.type === 'image/png' && (item.purpose ?? 'any') === purpose);
  for (const [size, purpose] of [[192, 'any'], [512, 'any'], [192, 'maskable'], [512, 'maskable']]) {
    assert.ok(icon(size, purpose), `${size} px ${purpose} icon`);
  }
});

test('every declared icon exists as a PNG of its declared size', () => {
  for (const item of manifest.icons) {
    const path = `public${item.src}`;
    assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), path);
    const [width, height] = pngSize(read(path));
    assert.equal(`${width}x${height}`, item.sizes, path);
  }
  assert.deepEqual(pngSize(read('public/icons/apple-touch-icon.png')), [180, 180]);
  // The icon files are generated from scripts/app-icons.js; keep the two lists in step.
  for (const file of ICON_FILES) assert.ok(existsSync(new URL(`../public/icons/${file.name}`, import.meta.url)), file.name);
});

test('the favicon is the app\'s gerbera, not the Vite starter logo', () => {
  const favicon = read('public/favicon.svg').toString();
  assert.doesNotMatch(favicon, /#863bff/i);
  assert.match(favicon, /<ellipse/);
});

test('the maskable icon keeps the flower inside the safe zone Android may crop to', () => {
  // Launchers may cut the icon to a circle of 80 % of its width; the whole bloom must stay inside it.
  const shapes = iconShapes({ maskable: true });
  const reach = Math.max(...shapes.filter(shape => shape.kind !== 'background').map(shape => shape.reach));
  assert.ok(reach <= MASKABLE_SAFE_RADIUS, `${reach.toFixed(3)} <= ${MASKABLE_SAFE_RADIUS}`);
  assert.equal(shapes[0].kind, 'background', 'full-bleed background so no transparent corners show');
});
