import { setText } from '../i18n.js';
import { store } from '../store.js';
import { buildCycleHistory, calculateSummary, cycleStarts, manualFields, summaryRows } from '../cycle-summary.js';

function currentSummary(start, manual) {
  const { maps, activeMapId } = store.getPersistentState();
  return calculateSummary(store.entries, start, manual, buildCycleHistory(maps, activeMapId));
}

function rowsElement(manual, result) {
  const rows = document.createElement('span');
  rows.className = 'cycle-summary-rows';
  summaryRows(manual, result).forEach(([label, value]) => {
    const row = document.createElement('span');
    row.className = 'cycle-summary-row';
    const name = document.createElement('span');
    setText(name, label);
    const content = document.createElement('strong');
    setText(content, value);
    row.append(name, content);
    rows.append(row);
  });
  return rows;
}

export function renderCycleSummary(container, preferredStart) {
  const map = store.getActiveMap();
  if (!map) return;
  container.querySelector('.cycle-summary-card')?.remove();
  const starts = cycleStarts(store.entries);
  const selected = store.selectedKey;
  const start = preferredStart ?? starts.filter(key => !selected || key <= selected).at(-1) ?? starts.at(-1);
  const manual = map.cycleSummaries?.[start] ?? {};
  const result = currentSummary(start, manual);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cycle-summary-card';
  button.setAttribute('aria-haspopup', 'dialog');
  const title = document.createElement('span');
  title.className = 'cycle-summary-heading';
  setText(title, 'Cycle summary  ✎');
  const subtitle = document.createElement('span');
  subtitle.className = 'cycle-summary-note';
  setText(subtitle, start ? `From ${start} · history ${result.available}/${result.count}${result.historyIncomplete ? ' · incomplete records' : ''}` : 'Record menstruation to start a cycle');
  button.append(title, subtitle, rowsElement(manual, result));
  button.disabled = !start;
  button.onclick = () => openSummary(container, start, button);
  container.append(button);
}

export function openCycleSummary(trigger) {
  const container = document.getElementById('profileInfoCard');
  const starts = cycleStarts(store.entries);
  const start = starts.filter(key => !store.selectedKey || key <= store.selectedKey).at(-1) ?? starts.at(-1);
  if (container && start && store.getActiveMap()) openSummary(container, start, trigger);
}

function openSummary(container, initialStart, trigger) {
  const mapId = store.getActiveMapId();
  const map = store.getActiveMap();
  const drafts = structuredClone(map.cycleSummaries ?? {});
  // Editing manual fields cannot change the observation history. Build it once
  // per editor session instead of scanning all maps on every keystroke.
  const history = buildCycleHistory(store.getPersistentState().maps, mapId);
  const summarizeDraft = manual => calculateSummary(store.entries, current, manual, history);
  const dialog = document.createElement('dialog');
  dialog.className = 'cycle-summary-dialog';
  dialog.setAttribute('aria-labelledby', 'cycleSummaryTitle');
  dialog.innerHTML = `<form><h2 id="cycleSummaryTitle" data-i18n>Cycle summary</h2>
    <div class="cycle-summary-content">
    <label class="cycle-summary-field"><span data-i18n>Cycle</span><select name="cycle"></select></label>
    <h3 data-i18n>Manual observations</h3><div class="cycle-summary-fields"></div>
    <label class="cycle-summary-field"><span data-i18n>Previous cycles</span><select name="historyCount"><option value="6" data-i18n>6 cycles</option><option value="12" data-i18n>12 cycles</option></select></label>
    <h3 data-i18n>Calculated results</h3><div class="cycle-summary-preview"></div>
    <p class="cycle-summary-note"><strong data-history-status></strong></p>
    <p class="cycle-summary-error" role="alert"></p>
    </div>
    <div class="cycle-summary-actions"><button type="button" class="btn" data-cancel data-i18n>Cancel</button><button type="submit" class="btn primary" data-i18n>Save changes</button></div></form>`;
  const form = dialog.querySelector('form');
  const cycleSelect = form.elements.cycle;
  cycleStarts(store.entries).reverse().forEach(key => {
    const option = document.createElement('option');
    option.value = key;
    setText(option, `From ${key}`);
    cycleSelect.append(option);
  });
  manualFields.forEach(([key, text]) => {
    const label = document.createElement('label');
    label.className = 'cycle-summary-field';
    const caption = document.createElement('span');
    setText(caption, text + (key === 'qualityDays' ? ' (days)' : ' (cycle day)'));
    label.append(caption);
    const input = document.createElement('input');
    input.name = key;
    input.type = 'number';
    input.inputMode = 'numeric';
    input.min = key === 'qualityDays' ? '0' : '1';
    input.step = '1';
    label.append(input);
    form.querySelector('.cycle-summary-fields').append(label);
  });
  let current = initialStart;
  cycleSelect.value = current;
  const read = () => {
    drafts[current] = Object.fromEntries(manualFields.map(([key]) => [key, form.elements[key].value === '' ? null : Number(form.elements[key].value)]));
    drafts[current].historyCount = Number(form.elements.historyCount.value);
  };
  const preview = () => {
    const manual = drafts[current] ?? {};
    const result = summarizeDraft(manual);
    form.querySelector('.cycle-summary-preview').replaceChildren(rowsElement(manual, result));
    setText(form.querySelector('[data-history-status]'), `History: ${result.available}/${result.count} completed cycles${result.historyIncomplete ? ' · missing or conflicting records' : ''}.`);
  };
  const populate = () => {
    const manual = drafts[current] ?? {};
    const length = summarizeDraft(manual).length;
    manualFields.forEach(([key]) => {
      form.elements[key].value = manual[key] ?? '';
      if (length) form.elements[key].max = String(length);
      else form.elements[key].removeAttribute('max');
    });
    form.elements.historyCount.value = manual.historyCount ?? 6;
    preview();
  };
  cycleSelect.onchange = () => {
    if (!form.reportValidity()) { cycleSelect.value = current; return; }
    read(); current = cycleSelect.value; populate();
  };
  form.oninput = event => { if (event.target !== cycleSelect) { read(); preview(); } };
  form.querySelector('[data-cancel]').onclick = () => dialog.close();
  form.onsubmit = event => {
    event.preventDefault();
    read();
    try {
      store.saveCycleSummaries(mapId, drafts);
      renderCycleSummary(container, current);
      dialog.close();
    } catch (error) {
      setText(form.querySelector('.cycle-summary-error'), error.message);
    }
  };
  dialog.addEventListener('close', () => {
    dialog.remove();
    (trigger.isConnected ? trigger : container.querySelector('.cycle-summary-card'))?.focus({ preventScroll: true });
  });
  populate();
  document.body.append(dialog);
  dialog.showModal();
}
