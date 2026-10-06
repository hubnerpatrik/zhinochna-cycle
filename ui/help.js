import { setTranslatedAttribute } from '../i18n.js';

// Native hover help follows the same translation mechanism as other UI copy.
const help = {
  'Main Menu': 'Open the overview and choose what to do next.',
  Menu: 'Open the overview and choose what to do next.',
  'My Profile': 'Set your profile and usual measurement time.',
  Profile: 'Review your profile and measurement settings.',
  'My Maps': 'Manage maps, import backups and download exports.',
  Maps: 'Manage maps, import backups and download exports.',
  'Create Map': 'Start a new map for your observations.',
  'New map': 'Start a new map for your observations.',
  'Active Map': 'Open the map currently selected for recording.',
  'Save Map': 'Save changes to the current map.',
  Save: 'Save changes in this form.',
  Cancel: 'Close without saving changes in this form.',
  Back: 'Return to the previous screen.',
  'Edit Day': 'Choose an observation to record for the selected day.',
  'Day record': 'Review and edit observations for the selected day.',
  'Day Info': 'Read all saved observations for the selected day.',
  Temperature: 'Record the measured temperature, time and influence factors.',
  Bleeding: 'Record menstruation, spotting and clots.',
  Mucus: 'Record sensation and cervical mucus observations.',
  Cervix: 'Record cervical firmness, height and openness.',
  Other: 'Record sex, symptoms and your own notes.',
  'Fertile range': 'Manually mark or unmark individual fertile days.',
  Coverlines: 'Select a coverline, then drag the line or its endpoints.',
  Markers: 'Place or edit your own interpretation markers.',
  'Cross cells': 'Select chart cells to cross out, then confirm.',
  'Zoom in': 'Enlarge the chart to see more detail.',
  'Zoom out': 'Reduce the chart to see more days.',
  'Show all': 'Fit the whole map and temperature range on screen.',
  Graph: 'Show temperatures and observation rows on the chart.',
  Calendar: 'Show days in the monthly calendar.',
  'Show observations': 'Expand the saved observation rows below the chart.',
  'Hide observations': 'Collapse the observation rows below the chart.',
  Tools: 'Open manual chart tools and fertile-day selection.',
  Summary: 'Review and edit your cycle summary.',
  Export: 'Download this map as PDF, CSV or a JSON backup.',
  'Import map': 'Add a map from a JSON backup to your saved maps.',
  "What's new": 'Read the changes in this version.',
  Changelog: 'Open the published release notes on GitHub.',
  'Sign out': 'End this account session on this device.',
  Language: 'Change the interface language without changing your records.',
};

export function initializeHelp() {
  const selector = 'button, a, select, h1, h2, h3, .section-title, .map-side-label, .info-title';
  const managed = new WeakMap();
  const describe = element => {
    if (element.hasAttribute('title') && !managed.has(element)) return;
    const source = element.getAttribute('data-i18n-aria-label')
      || element.getAttribute('data-i18n')
      || element.querySelector('[data-i18n]')?.getAttribute('data-i18n')
      || element.getAttribute('aria-label') || element.textContent.trim();
    const special = { prevMonth: 'Show the previous month.', nextMonth: 'Show the next month.' }[element.id];
    const description = special || help[source];
    // Unknown headings retain their own label; never scan or rewrite input values.
    const value = description || source;
    if (value && managed.get(element) !== value) {
      managed.set(element, value);
      setTranslatedAttribute(element, 'title', value);
    }
  };
  const scan = root => {
    if (root.matches?.(selector)) describe(root);
    root.querySelectorAll?.(selector).forEach(describe);
  };
  scan(document);
  new MutationObserver(records => {
    for (const record of records) {
      const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      const control = target?.closest(selector);
      if (control) describe(control);
      record.addedNodes?.forEach(node => { if (node.nodeType === 1) scan(node); });
    }
  }).observe(document.body, { childList: true, characterData: true, subtree: true,
    attributes: true, attributeFilter: ['data-i18n', 'data-i18n-aria-label'] });
}
