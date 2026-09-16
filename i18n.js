import { messages } from './i18n/catalog.js';

export const languages = Object.freeze({ en: 'EN', uk: 'UA', cs: 'CZ', sk: 'SK' });
export const LANGUAGE_KEY = 'cycle-app-language';
let language = 'en';
const languageIndex = { cs: 0, sk: 1, uk: 2 };
const listeners = new Set();
const originals = new WeakMap();
export const getLanguage = () => language;
export const getLocale = () => ({ en: 'en-GB', uk: 'uk-UA', cs: 'cs-CZ', sk: 'sk-SK' })[language];

export function setLanguage(value, storage) {
  language = Object.hasOwn(languages, value) ? value : 'en';
  try { (storage ?? globalThis.localStorage)?.setItem(LANGUAGE_KEY, language); } catch { /* Keep this session usable without storage. */ }
  listeners.forEach(listener => listener());
}

export function t(source) {
  const text = String(source ?? '');
  if (language === 'en') return text;
  const key = text.trim();
  const translated = messages[key]?.[languageIndex[language]];
  if (translated) return text.replace(key, translated);
  const info = /^(Bleeding|Clots|Sensation|Slippery|Discharge|Consistency|Color|Firmness|Height|Openness|Sex|Notes|Hours|Minutes): (.*)$/.exec(text);
  if (info) {
    const [, label, value] = info;
    if (label === 'Notes') return `${t(label)}: ${value}`;
    const [base, ...rest] = value.split(' (');
    return `${t(label)}: ${t(base)}${rest.length ? ' (' + rest.join(' (') : ''}`;
  }
  const adjusted = /^(.+) \(adjusted ([\d.]+) °C\)$/.exec(text);
  if (adjusted) return `${t(adjusted[1])} (${['upravená', 'upravená', 'скоригована'][languageIndex[language]]} ${adjusted[2]} °C)`;
  // Dynamic application copy. Captures remain data, never HTML or translation keys.
  const patterns = [
    [/^Backup version (.+) is not supported\.$/, ['Verze zálohy $1 není podporována.', 'Verzia zálohy $1 nie je podporovaná.', 'Версія резервної копії $1 не підтримується.']],
    [/^The profile field “(.+)” is malformed\.$/, ['Pole profilu „$1“ je neplatné.', 'Pole profilu „$1“ je neplatné.', 'Поле профілю «$1» некоректне.']],
    [/^The observation field “(.+)” for “(.+)” is malformed\.$/, ['Pole pozorování „$1“ pro „$2“ je neplatné.', 'Pole pozorovania „$1“ pre „$2“ je neplatné.', 'Поле спостереження «$1» для «$2» некоректне.']],
    [/^The observation for “(.+)” is malformed\.$/, ['Pozorování pro „$1“ je neplatné.', 'Pozorovanie pre „$1“ je neplatné.', 'Спостереження для «$1» некоректне.']],
    [/^The coverline “(.+)” is malformed\.$/, ['Pomocná čára „$1“ je neplatná.', 'Pomocná čiara „$1“ je neplatná.', 'Допоміжна лінія «$1» некоректна.']],
    [/^Invalid cycle summary field: (.+)\.$/, ['Neplatné pole souhrnu cyklu: $1.', 'Neplatné pole súhrnu cyklu: $1.', 'Некоректне поле підсумку циклу: $1.']],
    [/^Map “(.+)” (?:is malformed|has a mismatched ID|has a malformed name|has a malformed profile snapshot|has a malformed profile ownership value)\.$/, ['Mapa „$1“ obsahuje neplatná data.', 'Mapa „$1“ obsahuje neplatné dáta.', 'Карта «$1» містить некоректні дані.']],
    [/^Cycle day (\d+)$/, ['Den cyklu $1', 'Deň cyklu $1', 'День циклу $1']],
    [/^Day (\d+)$/, ['Den $1', 'Deň $1', 'День $1']],
    [/^(\d+) days$/, ['$1 dní', '$1 dní', 'Кількість днів: $1']],
    [/^From (\d{4}-\d{2}-\d{2})$/, ['Od $1', 'Od $1', 'Від $1']],
    [/^From (\S+) · history (\d+\/\d+)(.*)$/, ['Od $1 · historie $2$3', 'Od $1 · história $2$3', 'Від $1 · історія $2$3']],
    [/^History: (\d+\/\d+) completed cycles(.*)\.$/, ['Historie: $1 dokončených cyklů$2.', 'História: $1 dokončených cyklov$2.', 'Історія: $1 завершених циклів$2.']],
    [/^Temperature must be between (.+) °C$/, ['Teplota musí být v rozmezí $1 °C', 'Teplota musí byť v rozmedzí $1 °C', 'Температура має бути в межах $1 °C']],
    [/^Cleared (\d+) days? in this month$/, ['Vymazané dny v tomto měsíci: $1', 'Vymazané dni v tomto mesiaci: $1', 'Очищено днів у цьому місяці: $1']],
    [/^≈ (.+) °C vs usual time$/, ['≈ $1 °C oproti obvyklému času', '≈ $1 °C oproti obvyklému času', '≈ $1 °C порівняно зі звичайним часом']],
    [/^“(.*)” imported ✓$/, ['„$1“ importována ✓', '„$1“ importovaná ✓', '«$1» імпортовано ✓']],
    [/^“(.*)” exported ✓$/, ['„$1“ exportována ✓', '„$1“ exportovaná ✓', '«$1» експортовано ✓']],
    [/^(\d+) days? · (\d+) temps · (\d+) period days · (\d+) notes$/, ['Dny: $1 · teploty: $2 · dny menstruace: $3 · poznámky: $4', 'Dni: $1 · teploty: $2 · dni menštruácie: $3 · poznámky: $4', 'Дні: $1 · температури: $2 · дні менструації: $3 · нотатки: $4']],
    [/^(\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})$/, ['$1 až $2', '$1 až $2', '$1 — $2']],
    [/^(\S+) \(CD (.+)\)$/, ['$1 (DC $2)', '$1 (DC $2)', '$1 (ДЦ $2)']],
    [/^([\d.]+) °C at ([\d:]+)$/, ['$1 °C v $2', '$1 °C o $2', '$1 °C о $2']],
  ];
  const suffixes = {
    ' · incomplete records': [' · neúplné záznamy', ' · neúplné záznamy', ' · неповні записи'],
    ' · missing or conflicting records': [' · chybějící nebo rozporné záznamy', ' · chýbajúce alebo rozporné záznamy', ' · відсутні або суперечливі записи'],
    ' (cycle day)': [' (den cyklu)', ' (deň cyklu)', ' (день циклу)'],
    ' (days)': [' (dny)', ' (dni)', ' (дні)'],
  };
  for (const [suffix, values] of Object.entries(suffixes)) {
    if (text.endsWith(suffix)) return t(text.slice(0, -suffix.length)) + values[languageIndex[language]];
    if (text.endsWith(suffix + '.')) return t(text.slice(0, -suffix.length - 1) + '.').replace(/\.$/, values[languageIndex[language]] + '.');
  }
  for (const [pattern, values] of patterns) {
    if (pattern.test(text)) return text.replace(pattern, values[languageIndex[language]]);
  }
  return text;
}

export function setTranslatedAttribute(element, attribute, source) {
  element.setAttribute(`data-i18n-${attribute}`, source);
  element.setAttribute(attribute, t(source));
}

// Only explicitly marked application copy is translated. Form values, names,
// notes, markers, and imported profile data are never scanned or rewritten.
export function setText(element, source) {
  if (!element) return;
  originals.set(element, String(source ?? ''));
  element.setAttribute?.('data-i18n', String(source ?? ''));
  element.textContent = t(source);
}

export function setDateText(element, date, format = 'month') {
  if (!element) return;
  element.setAttribute('data-i18n-date', String(date.getTime()));
  element.setAttribute('data-i18n-date-format', format);
  element.textContent = date.toLocaleDateString(getLocale(), format === 'month'
    ? { month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short' });
}

const selector = '[data-i18n], [data-i18n-date], [data-i18n-title], [data-i18n-aria-label], [data-i18n-placeholder]';
function localizeElement(element) {
  if (element.hasAttribute('data-i18n')) {
    const stored = element.getAttribute('data-i18n');
    if (stored) originals.set(element, stored);
    else if (!originals.has(element)) {
      originals.set(element, element.textContent);
      // Cloned dialogs retain their English source even after translation.
      if (element.textContent) element.setAttribute('data-i18n', element.textContent);
    }
    const value = t(originals.get(element));
    if (element.textContent !== value) element.textContent = value;
  }
  if (element.hasAttribute('data-i18n-date')) {
    const date = new Date(Number(element.getAttribute('data-i18n-date')));
    const value = date.toLocaleDateString(getLocale(), element.getAttribute('data-i18n-date-format') === 'month'
      ? { month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short' });
    if (element.textContent !== value) element.textContent = value;
  }
  for (const attr of ['title', 'aria-label', 'placeholder']) {
    const source = element.getAttribute(`data-i18n-${attr}`);
    if (source !== null && element.getAttribute(attr) !== t(source)) element.setAttribute(attr, t(source));
  }
}

export function translateDOM(root = document) {
  if (root.matches?.(selector)) localizeElement(root);
  root.querySelectorAll?.(selector).forEach(localizeElement);
}

export function initializeLanguage() {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    language = Object.hasOwn(languages, saved) ? saved : 'en';
  } catch { language = 'en'; }
  const update = () => {
    document.documentElement.lang = language;
    document.querySelectorAll('[data-language-select]').forEach(select => { select.value = language; });
    translateDOM();
  };
  listeners.add(update);
  document.querySelectorAll('[data-language-select]').forEach(select => {
    select.addEventListener('change', () => setLanguage(select.value));
  });
  // Handle newly rendered screens and dialogs without replacing forms or losing drafts.
  new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes') localizeElement(record.target);
      else if (record.type === 'characterData') {
        if (record.target.parentElement?.matches(selector)) localizeElement(record.target.parentElement);
      } else {
        if (record.target.matches?.(selector)) localizeElement(record.target);
        record.addedNodes.forEach(node => { if (node.nodeType === 1) translateDOM(node); });
      }
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true,
    attributeFilter: ['data-i18n', 'data-i18n-date', 'data-i18n-date-format', 'data-i18n-title', 'data-i18n-aria-label', 'data-i18n-placeholder'] });
  update();
}
