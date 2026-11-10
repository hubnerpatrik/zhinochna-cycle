import { DYNAMIC_MESSAGE_PATTERNS, DYNAMIC_MESSAGE_SUFFIXES } from './i18n/dynamic-messages.js';
import { messages } from './i18n/catalog.js';
import { formatMonthPeriod } from './month-period.js';

export const languages = Object.freeze({ en: 'English', uk: 'Українська', cs: 'Čeština', sk: 'Slovenčina' });
export const LANGUAGE_KEY = 'cycle-app-language';
let language = 'en';
const LANGUAGE_INDEX = { cs: 0, sk: 1, uk: 2 };
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
  const translated = messages[key]?.[LANGUAGE_INDEX[language]];
  if (translated) return text.replace(key, translated);
  const dayHelp = /^(\d{4}-\d{2}-\d{2} · )(.*)$/.exec(text);
  if (dayHelp) return dayHelp[1] + t(dayHelp[2]);
  const cervixPosition = /^(Height: .+) · (Openness: .+)$/.exec(text);
  if (cervixPosition) return `${t(cervixPosition[1])} · ${t(cervixPosition[2])}`;
  const info = /^(Bleeding|Period intensity|Clots|Sensation|Slippery|Discharge|Consistency|Color|Firmness|Height|Openness|Sex|Notes|Hours|Minutes): (.*)$/.exec(text);
  if (info) {
    const [, label, value] = info;
    if (label === 'Notes') return `${t(label)}: ${value}`;
    const [base, ...rest] = value.split(' (');
    return `${t(label)}: ${t(base)}${rest.length ? ' (' + rest.join(' (') : ''}`;
  }
  const adjusted = /^(.+) \(adjusted ([\d.]+) °C\)$/.exec(text);
  if (adjusted) return `${t(adjusted[1])} (${['upravená', 'upravená', 'скоригована'][LANGUAGE_INDEX[language]]} ${adjusted[2]} °C)`;
  // Dynamic application copy. Captures remain data, never HTML or translation keys.
  for (const [suffix, values] of Object.entries(DYNAMIC_MESSAGE_SUFFIXES)) {
    if (text.endsWith(suffix)) return t(text.slice(0, -suffix.length)) + values[LANGUAGE_INDEX[language]];
    if (text.endsWith(suffix + '.')) return t(text.slice(0, -suffix.length - 1) + '.').replace(/\.$/, values[LANGUAGE_INDEX[language]] + '.');
  }
  for (const [pattern, values] of DYNAMIC_MESSAGE_PATTERNS) {
    if (pattern.test(text)) return text.replace(pattern, values[LANGUAGE_INDEX[language]]);
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

export function setMonthPeriod(element, keys) {
  if (!element) return;
  const sorted = [...keys].sort();
  element.setAttribute('data-i18n-period-start', sorted[0] || '');
  element.setAttribute('data-i18n-period-end', sorted.at(-1) || '');
  element.textContent = formatMonthPeriod(sorted[0], sorted.at(-1), getLocale());
}

const selector = '[data-i18n], [data-i18n-date], [data-i18n-period-start], [data-i18n-title], [data-i18n-aria-label], [data-i18n-placeholder], [data-i18n-alt]';
function localizeElement(element) {
  if (element.hasAttribute('data-i18n-period-start')) {
    const value = formatMonthPeriod(element.getAttribute('data-i18n-period-start'), element.getAttribute('data-i18n-period-end'), getLocale());
    if (element.textContent !== value) element.textContent = value;
  }
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
  for (const attr of ['title', 'aria-label', 'placeholder', 'alt']) {
    const source = element.getAttribute(`data-i18n-${attr}`);
    if (source !== null && element.getAttribute(attr) !== t(source)) element.setAttribute(attr, t(source));
  }
}

export function translateDOM(root = document) {
  if (root.matches?.(selector)) localizeElement(root);
  root.querySelectorAll?.(selector).forEach(localizeElement);
}

function initializeLanguagePicker(picker, template) {
  picker.append(template.content.cloneNode(true));
  const trigger = picker.querySelector('summary');
  const currentFlag = picker.querySelector('[data-current-language-flag]');
  const currentName = picker.querySelector('[data-current-language-name]');
  const options = picker.querySelectorAll('[data-language]');
  const closeAndFocus = () => {
    picker.open = false;
    trigger.focus();
  };
  options.forEach(option => {
    const code = option.dataset.language;
    option.setAttribute('aria-label', languages[code]);
    option.title = languages[code];
    option.addEventListener('click', () => {
      setLanguage(code);
      closeAndFocus();
    });
  });
  picker.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !picker.open) return;
    event.preventDefault();
    event.stopPropagation();
    closeAndFocus();
  });
  picker.addEventListener('focusout', event => {
    if (event.relatedTarget && !picker.contains(event.relatedTarget)) picker.open = false;
  });
  return () => {
    currentFlag.dataset.flag = language;
    currentName.lang = language;
    currentName.textContent = languages[language];
    options.forEach(option => option.setAttribute('aria-pressed', String(option.dataset.language === language)));
  };
}

export function initializeLanguage() {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    language = Object.hasOwn(languages, saved) ? saved : 'en';
  } catch { language = 'en'; }
  const pickers = [...document.querySelectorAll('.language-picker')];
  const template = document.getElementById('languagePickerTemplate');
  const updatePickers = pickers.map(picker => initializeLanguagePicker(picker, template));
  document.addEventListener('pointerdown', event => {
    pickers.forEach(picker => { if (!picker.contains(event.target)) picker.open = false; });
  });
  const update = () => {
    document.documentElement.lang = language;
    updatePickers.forEach(updatePicker => updatePicker());
    translateDOM();
  };
  listeners.add(update);
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
    attributeFilter: ['data-i18n', 'data-i18n-date', 'data-i18n-date-format', 'data-i18n-title', 'data-i18n-aria-label', 'data-i18n-placeholder', 'data-i18n-alt'] });
  update();
}
