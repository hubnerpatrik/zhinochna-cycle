// Shared rounded contours and translucent fills for actions and map tools.
const icons = {
  edit: ['<path d="M4 20l4-1 11-11-3-3L5 16l-1 4Z"/>', '<path d="M4 20l4-1 11-11-3-3L5 16l-1 4Z"/><path d="M14 6l3 3"/>'],
  info: ['<circle cx="12" cy="12" r="9"/>', '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".5" fill="currentColor"/>'],
  fertile: ['<path d="M5 4h11l-2.5 3.5L16 11H5Z"/>', '<path d="M5 21V4h11l-2.5 3.5L16 11H5"/>'],
  temperature: ['<path d="M12 14.5V5a2 2 0 1 0-4 0v9.5a4 4 0 1 0 4 0Z"/>', '<path d="M12 14.5V5a2 2 0 1 0-4 0v9.5a4 4 0 1 0 4 0Z"/><path d="M12 9v4"/>'],
  period: ['<path d="M12 3c4 5 7 8.5 7 12a7 7 0 1 1-14 0c0-3.5 3-7 7-12Z"/>', '<path d="M12 3c4 5 7 8.5 7 12a7 7 0 1 1-14 0c0-3.5 3-7 7-12Z"/>'],
  mucus: ['<path d="M3 9c1.5 1.6 3 1.6 4.5 0s3-1.6 4.5 0 3 1.6 4.5 0 3-1.6 4.5 0v6c-1.5-1.6-3-1.6-4.5 0s-3 1.6-4.5 0-3-1.6-4.5 0-3 1.6-4.5 0Z"/>', '<path d="M3 9c1.5 1.6 3 1.6 4.5 0s3-1.6 4.5 0 3 1.6 4.5 0 3-1.6 4.5 0M3 15c1.5 1.6 3 1.6 4.5 0s3-1.6 4.5 0 3 1.6 4.5 0 3-1.6 4.5 0"/>'],
  cervix: ['<circle cx="12" cy="12" r="7"/>', '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7"/>'],
  other: ['', '<g fill="currentColor" stroke="none"><circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/></g>'],
  save: ['<path d="M4 3h12l4 4v14H4Z"/>', '<path d="M4 3h12l4 4v14H4ZM8 3v6h8V3M8 21v-7h8v7"/>'],
  tools: ['<circle cx="9" cy="6" r="3"/><circle cx="16" cy="12" r="3"/><circle cx="8" cy="18" r="3"/>', '<path d="M3 6h3m6 0h9M3 12h10m6 0h2M3 18h2m6 0h10"/><circle cx="9" cy="6" r="3"/><circle cx="16" cy="12" r="3"/><circle cx="8" cy="18" r="3"/>'],
  calendar: ['<rect x="4" y="5" width="16" height="16" rx="3"/>', '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 11h16m-12 4h2m4 0h2m-8 3h2"/>'],
  graph: ['<path d="m6 15 4-5 4 3 6-8v15H6Z"/>', '<path d="M3 3v18h18M6 15l4-5 4 3 6-8"/>'],
  coverlines: ['<rect x="5" y="5" width="14" height="14" rx="3"/>', '<path d="M6 3v15h15M3 7l3-4 3 4m8 8 4 3-4 3"/>'],
  markers: ['<path d="M6 4h13l-3 4 3 4H6Z"/>', '<path d="M6 21V4h13l-3 4 3 4H6"/>'],
  cross: ['', '<path d="m4 18 16-12" stroke-width="2"/>'],
};

export function interfaceIcon(name) {
  const [fill, line] = icons[name] || icons.info;
  // The original drawings do not all share a visual center within the 24-unit grid.
  const offset = { temperature: '2 -.5', period: '0 -.5', edit: '.5 -.5', fertile: '1.5 -.5' }[name] || '0 0';
  return `<svg class="interface-duotone" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(${offset})"><g fill="currentColor" fill-opacity=".2" stroke="none">${fill}</g>${line}</g></svg>`;
}

export function enhanceInterfaceIcons(root = document) {
  const buttons = {
    mobileGraphTab: 'graph', mobileCalendarTab: 'calendar', mobileDayBtn: 'edit', mobileTools: 'tools',
    mobileSaveBtn: 'save', coverlineBtn: 'coverlines', markersActionBtn: 'markers',
    crossCellsActionBtn: 'cross', saveActiveMapBtn: 'save',
  };
  for (const [id, name] of Object.entries(buttons)) {
    const button = root.getElementById(id);
    if (!button) continue;
    const current = button.querySelector('svg:not(.mobile-tools-chevron)');
    if (current) current.outerHTML = interfaceIcon(name);
    else {
      const source = button.getAttribute('data-i18n');
      if (!source) continue;
      button.removeAttribute('data-i18n');
      const label = document.createElement('span');
      label.setAttribute('data-i18n', source); label.textContent = source;
      button.innerHTML = interfaceIcon(name); button.append(label);
      button.classList.add('icon-label-button');
    }
  }
  root.querySelectorAll('[data-mobile-tool] .mobile-tool-icon').forEach(target => {
    const control = target.closest('[data-mobile-tool]').dataset.mobileTool;
    const name = { fertileRangeActionBtn: 'fertile', coverlineBtn: 'coverlines', markersActionBtn: 'markers', crossCellsActionBtn: 'cross' }[control];
    if (name) target.innerHTML = interfaceIcon(name);
  });
}
