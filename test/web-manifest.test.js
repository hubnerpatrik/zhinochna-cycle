import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('index.html links the web app manifest so Android Chrome can install the site', () => {
  const html = read('index.html');
  assert.match(html, /<link rel="manifest" href="\/manifest\.json">/);
  assert.match(html, /<meta name="theme-color"/);
  assert.match(html, /<link rel="apple-touch-icon"/);
});

test('the manifest meets Chrome install criteria', () => {
  const manifest = JSON.parse(read('public/manifest.json'));
  assert.ok(manifest.name && manifest.short_name);
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.display, 'standalone');
  const sizes = manifest.icons.filter(icon => icon.type === 'image/png').map(icon => icon.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
  assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'));
  for (const icon of manifest.icons) assert.ok(existsSync(new URL(`../public${icon.src}`, import.meta.url)), `${icon.src} exists`);
});
