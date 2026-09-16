import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { messages } from '../i18n/catalog.js';
import { getLanguage, getLocale, LANGUAGE_KEY, setLanguage, setText, t, translateDOM } from '../i18n.js';
import { MemoryStorage } from './setup.js';

test('English is the default; supported languages persist with standard locale codes', () => {
  assert.equal(getLanguage(), 'en');
  const storage = new MemoryStorage();
  for (const [language, locale, label] of [['uk', 'uk-UA', 'Зберегти'], ['cs', 'cs-CZ', 'Uložit'], ['sk', 'sk-SK', 'Uložiť'], ['en', 'en-GB', 'Save']]) {
    setLanguage(language, storage);
    assert.equal(storage.getItem(LANGUAGE_KEY), language);
    assert.equal(getLocale(), locale);
    assert.equal(t('Save'), label);
  }
  setLanguage('invalid', storage);
  assert.equal(getLanguage(), 'en');
  setLanguage('cs', { setItem() { throw Error('blocked storage'); } });
  assert.equal(t('Cycle day 12'), 'Den cyklu 12');
  setLanguage('en', storage);
});

test('dynamic translations preserve user text, including strings that resemble labels', () => {
  setLanguage('cs');
  assert.equal(t('Notes: Save'), 'Poznámky: Save');
  assert.equal(t('Color: Other (White)'), 'Barva: Jiné (White)');
  assert.equal(t('“Save” imported ✓'), '„Save“ importována ✓');
  assert.equal(t('From 2026-09-01 · history 3/6 · incomplete records'), 'Od 2026-09-01 · historie 3/6 · neúplné záznamy');
  assert.equal(t('History: 3/6 completed cycles · missing or conflicting records.'), 'Historie: 3/6 dokončených cyklů · chybějící nebo rozporné záznamy.');
  setLanguage('en');
});

test('marked labels switch repeatedly and clear without touching unmarked user data', () => {
  const element = () => ({
    attributes: {}, textContent: '',
    setAttribute(key, value) { this.attributes[key] = value; },
    getAttribute(key) { return this.attributes[key] ?? null; },
    hasAttribute(key) { return Object.hasOwn(this.attributes, key); },
    matches() { return this.hasAttribute('data-i18n'); }, querySelectorAll() { return []; },
  });
  const label = element();
  const userName = element();
  userName.textContent = 'Save';
  setText(label, 'Save');
  for (const language of ['cs', 'uk', 'en', 'sk']) {
    setLanguage(language);
    translateDOM(label); translateDOM(userName);
    assert.equal(label.textContent, t('Save'));
    assert.equal(userName.textContent, 'Save');
  }
  setText(label, ''); translateDOM(label);
  assert.equal(label.textContent, '');
  setLanguage('en');
});

test('every marked static label has translations in all three additional languages', () => {
  const paths = ['index.html', ...['ui', 'views'].flatMap(dir => readdirSync(dir).filter(name => name.endsWith('.js')).map(name => `${dir}/${name}`))];
  const missing = new Set();
  for (const path of paths) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
    const labels = [...source.matchAll(/data-i18n>([^<>]+)</g), ...source.matchAll(/data-i18n-(?:aria-label|title|placeholder)="([^"$]+)"/g)];
    for (const [, value] of labels) {
      const key = value.trim();
      if (/[${}]/.test(key) || ['P', 'BBT', 'DEV RESET'].includes(key) || !/[A-Za-z]/.test(key)) continue;
      if (!messages[key]?.every(Boolean) || messages[key].length !== 3) missing.add(key);
    }
  }
  assert.deepEqual([...missing], []);
});
