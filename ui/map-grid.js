import { setText, setTranslatedAttribute } from '../i18n.js';
import { setChartWidth } from './layout-classes.js';
import { store } from "../store.js";
import { chartWidth, qs } from "../core.js";
import { renderCycleSummary } from "./cycle-summary.js";
import { profileInfoRows } from "./profile-info-modal.js";
import { observationIcon } from "./observation-icons.js";
import { interfaceIcon } from './interface-icons.js';
import { bleedingIcon, BLEEDING_LABELS } from './bleeding-icons.js';
import { observationScaleIcon, OBSERVATION_LABELS } from './observation-scales.js';

const SIDEBAR_ACTIONS = [
  ['editBtn', 'Edit Day', 'chip-edit-special', 'edit'],
  ['dayInfoBtn', 'Day Info', 'chip-gray', 'info'],
  ['fertileRangeActionBtn', 'Fertile range', 'chip-green', 'fertile'],
];
const MODAL_ACTIONS = [
  ['temperatureActionBtn', 'Temperature', 'chip-orange', 'temperature'],
  ['bleedingActionBtn', 'Bleeding', 'chip-red', 'period'],
  ['mucusActionBtn', 'Mucus', 'chip-blue', 'mucus'],
  ['cervixActionBtn', 'Cervix', 'chip-teal', 'cervix'],
  ['otherActionBtn', 'Other', 'chip-purple', 'other'],
];

function createActionButton([id, label, iconClass, iconSvg]) {
  const button = document.createElement("button");
  button.id = id;
  button.className = "action-btn";
  button.type = "button";
  button.innerHTML = `
    <span class="action-icon ${iconClass}">${interfaceIcon(iconSvg)}</span>
    <span class="action-label" data-i18n>${label}</span>
    <svg class="action-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
  `;
  return button;
}

export function renderActionButtons() {
  const targets = [
    [qs("sidebarActions"), SIDEBAR_ACTIONS],
    [qs("actionModalActions"), MODAL_ACTIONS],
  ];
  targets.forEach(([target, actions]) => {
    if (!target) return;
    target.className = "action-list";
    target.replaceChildren(...actions.map(createActionButton));
  });
}

export function renderProfileInfo() {
  const card = qs("profileInfoCard");
  if (!card) return;
  const profile = store.getActiveMapProfile();
  const rows = profileInfoRows(profile).filter(([, value]) => value);

  if (!rows.length) {
    card.replaceChildren();
    renderCycleSummary(card);
    return;
  }
  card.innerHTML = `
    <div class="profile-info-title" data-i18n>Profile</div>
    <div class="profile-info-rows"></div>`;
  const container = card.querySelector(".profile-info-rows");
  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    const name = document.createElement("span");
    const content = document.createElement("span");
    row.className = "profile-info-row";
    name.className = "profile-info-label";
    content.className = "profile-info-value";
    setText(name, label);
    if (label === "Goal" || label === "Measurement method") setText(content, value);
    else content.textContent = value;
    row.append(name, content);
    container.appendChild(row);
  });
  renderCycleSummary(card);
}

function makeCell(text = "", selected = "", group = "", ...classes) {
  const cell = document.createElement("div");
  cell.className = [
    "map-cell",
    selected,
    group ? `map-cell-accent map-cell-accent-${group}` : "",
    group ? "map-cell-pill" : "",
    ...classes,
  ].filter(Boolean).join(" ");
  cell.textContent = text;
  return cell;
}

function createRowDefinitions() {
  return [
    ["cycleDayRow", "Cycle days", "", column => makeCell(column.cycleDay)],
    ["bleedingRow", "Period", "red", column => bleedingCell(column, 'menstruation')],
    ["spottingRow", "Spotting", "red", column => bleedingCell(column, 'spotting')],
    ["sedimentRow", "Clots", "red", column => makeCell(column.sediment ? "✓" : "", "", "red")],
    ["sensationRow", "Sensation", "mucus", column => scaleCell(column, 'sensation', 'Sensation', 'mucus')],
    ["stretchRow", "Slippery ", "mucus", column => makeCell(column.stretch ? "✓" : "", "", "mucus")],
    ["visibleRow", "Discharge", "mucus", column => makeCell(column.visible ? "✓" : "", "", "mucus")],
    ["consistencyRow", "Consistency", "mucus", column => scaleCell(column, 'consistency', 'Consistency', 'mucus')],
    ["colorRow", "Color", "mucus", column => scaleCell(column, 'color', 'Color', 'mucus')],
    ["blueMarkerRow", "Peak Mucus", "mucus", column => makeCell(column.markers?.mucus?.value || "", "", "mucus", column.markers?.mucus?.value ? "marker-blue" : "")],
    ["cervixFirmnessRow", "Firmness", "cervix", column => scaleCell(column, 'cervixFirmness', 'Firmness', 'cervix')],
    ["cervixHeightRow", "Height", "cervix", column => scaleCell(column, 'cervixHeight', 'Height', 'cervix')],
    ["cervixOpennessRow", "Openness", "cervix", column => scaleCell(column, 'cervixOpenness', 'Openness', 'cervix')],
    ["orangeMarkerRow", "Peak Cervix", "cervix", column => makeCell(column.markers?.cervix?.value || "", "", "cervix", column.markers?.cervix?.value ? "marker-orange" : "")],
    ["otherRow", "Additional symptoms", "symptoms", column => makeCell(column.other ? "✓" : "", "", "symptoms")],
    ["sexRow", "Sex", "symptoms", column => makeCell(column.sex === true ? "✓" : "", "", "symptoms")],
  ].map(([id, label, group, render], index, definitions) => {
    if (!group) return { id, label, group, render, position: "none" };
    const previousGroup = definitions[index - 1]?.[2];
    const nextGroup = definitions[index + 1]?.[2];
    const start = previousGroup !== group;
    const end = nextGroup !== group;
    const position = start && end ? "single" : start ? "start" : end ? "end" : "middle";
    return { id, label, group, render, position };
  });
}

function scaleCell(column, field, label, group) {
  const cell = makeCell('', '', group, 'observation-scale-cell');
  const entry = store.entries[column.key];
  if (!entry || !Object.hasOwn(entry, field)) return cell;
  const value = entry[field];
  const svg = observationScaleIcon(field, value);
  if (!svg) return cell;
  cell.innerHTML = svg;
  const source = `${label}: ${OBSERVATION_LABELS[field][value]}${field === 'color' && value === 'other' && entry.colorOther ? ` (${entry.colorOther})` : ''}`;
  setTranslatedAttribute(cell, 'title', source);
  setTranslatedAttribute(cell, 'aria-label', source);
  return cell;
}

function bleedingCell(column, kind) {
  const cell = makeCell('', '', 'red', 'bleeding-cell');
  if (column.bleeding === kind) {
    cell.innerHTML = bleedingIcon(column.bleedingIntensity || (kind === 'spotting' ? 'spotting' : ''));
    setTranslatedAttribute(cell, 'title', BLEEDING_LABELS[column.bleedingIntensity] || (kind === 'spotting' ? 'Spotting' : 'Period'));
  }
  return cell;
}

export function visibleObservationRows(entries) {
  const observations = Object.values(entries);
  const recorded = value => value !== undefined && value !== null && value !== '';
  return {
    cervix: observations.some(entry => ['cervixFirmness', 'cervixHeight', 'cervixOpenness'].some(key => recorded(entry[key])) || entry.markers?.cervix?.value),
    symptoms: observations.some(entry => recorded(entry.sex) || entry.other?.trim()),
  };
}

function createMapRow({ id, label, group, position }) {
  const row = document.createElement("div");
  row.className = [
    "map-row",
    group ? `map-row-group map-row-group-${group}` : "",
    group ? `map-row-group-${position}` : "",
  ].filter(Boolean).join(" ");
  const sideLabel = document.createElement("div");
  const spacer = document.createElement("div");
  const cells = document.createElement("div");
  sideLabel.className = "map-side-label";
  const icon = document.createElement("span");
  icon.className = "map-row-icon";
  icon.setAttribute("role", "img");
  setTranslatedAttribute(icon, "aria-label", label.trim());
  setTranslatedAttribute(icon, "title", label.trim());
  icon.innerHTML = observationIcon(id);
  const caption = document.createElement("span");
  caption.className = "map-row-caption";
  setText(caption, label);
  sideLabel.append(icon, caption);
  spacer.className = "map-temp-spacer";
  cells.className = ["map-cells", group ? `map-cells-group-${group}` : ""].filter(Boolean).join(" ");
  row.append(sideLabel, spacer, cells);
  qs("mapRows").appendChild(row);
  return cells;
}

export function renderMapRows(columns, selectColumn, hoverColumn, clearHover) {
  const dayNumbers = qs("dayNumbers");
  const mapRows = qs("mapRows");
  if (!dayNumbers || !mapRows) return;
  dayNumbers.replaceChildren();
  setChartWidth(dayNumbers, chartWidth(columns));
  mapRows.replaceChildren();

  const visible = visibleObservationRows(store.entries);
  const definitions = createRowDefinitions().filter(definition => visible[definition.group] !== false);
  const rows = Object.fromEntries(definitions.map(definition => [definition.id, createMapRow(definition)]));
  const attach = (element, column) => {
    element.onmouseenter = () => hoverColumn(column.key);
    element.onmouseleave = clearHover;
    element.onclick = () => selectColumn(column.key);
  };

  columns.forEach((column, index) => {
    const boundary = index > 0 && column.cycleId !== columns[index - 1].cycleId;
    const selected = store.selectedKey === column.key ? "selected-column" : "";
    const dayCell = document.createElement("div");
    dayCell.className = ["map-day", selected, column.isFertile ? "fertility-cell" : ""].filter(Boolean).join(" ");
    dayCell.textContent = column.date.getDate();
    setTranslatedAttribute(dayCell, 'title', `${column.key} · Select this day to review or edit its observations.`);
    if (boundary) dayCell.classList.add("cycle-boundary");
    attach(dayCell, column);
    dayNumbers.appendChild(dayCell);

    definitions.forEach(definition => {
      const cell = definition.render(column);
      if (boundary) cell.classList.add("cycle-boundary");
      if (selected) cell.classList.add(selected);
      if (column.isFertile) cell.classList.add("fertility-cell");
      if (store.entries[column.key]?.crossedRows?.includes(definition.id)) cell.classList.add("crossed-cell");
      attach(cell, column);
      rows[definition.id].appendChild(cell);
    });
  });
}
