import { jpegPagesPdf } from './pdf-document.js';
export { jpegPagesPdf } from './pdf-document.js';
import { t } from './i18n.js';
import { EXPORT_FIELDS, EXPORT_LABELS, observationText, sortedMapEntries } from './export-data.js';
import { MILLISECONDS_PER_DAY } from './date-utils.js';
import { templatePages, TEMPLATE_ROWS } from './observation-template.js';
import { mapBackupPayload } from './map-transfer.js';
import { calculateSummary } from './cycle-summary.js';
import { drawTemplateLabels } from './pdf-template-labels.js';
import { PROFILE_GOALS, MEASUREMENT_METHODS } from './profile-options.js';

export async function mapPdf(map, backup = mapBackupPayload(map)) {
  const image = new Image();
  image.src = new URL('./assets/observation-template.png', import.meta.url).href;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = 1428; canvas.height = 2022;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const pages = [];
  for (const page of templatePages(map)) {
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.scale(2, 2);
    drawTemplateLabels(ctx);
    const text = (value, x, y, size = 8, max = 550) => {
      ctx.font = `${size}px Arial, sans-serif`; ctx.fillStyle = '#111';
      ctx.fillText(String(value ?? ''), x, y, max);
    };
    text(map.name || t('Untitled map'), 80, 59, 8, 105);
    text(page.dates[0]?.slice(5, 7) || '', 237, 59);
    text(page.dates[0]?.slice(0, 4) || '', 404, 59);
    const profile = map.profileSnapshot || {};
    text(profile.age || '', 552, 59, 8, 40);
    text(map.name || '', 27, 887, 8, 177);
    text(t(PROFILE_GOALS[profile.goal] || ''), 216, 887, 8, 200);
    text(profile.usualMeasurementTime || '', 447, 887, 8, 36);
    text(t(MEASUREMENT_METHODS[profile.measurementMethod] || ''), 555, 887, 8, 130);
    const manual = map.cycleSummaries?.[page.start] || {};
    const summary = page.start ? calculateSummary(map.entries, page.start, manual) : {};
    for (const [value, x, y] of [
      [summary.max, 251, 914], [summary.min, 251, 927], [summary.lastInfertile, 251, 940], [summary.length, 251, 953],
      [manual.firstMucus, 462, 914], [manual.qualityMucus, 462, 927], [manual.qualityDays, 462, 940], [manual.mucusPeak, 462, 953],
      [summary.bbtRise, 644, 914], [summary.mucusPlus4, 644, 927], [summary.cervixPlus4, 644, 940], [summary.bbtPhase, 598, 953], [summary.mucusPhase, 657, 953],
    ]) if (value != null) text(value, x, y, 8, 30);
    const left = 129.5, step = (690.5 - left) / 43;
    const tempY = temp => 417.4 - (temp - 36) / 1.4 * 310.7;
    let previous = null;
    page.dates.forEach((date, index) => {
      const e = map.entries[date] || {}, x = left + (index + .5) * step;
      ctx.save(); ctx.translate(x + 2, 89); ctx.rotate(-Math.PI / 2); text(date.slice(5), 0, 0, 6.5); ctx.restore();
      // Continuation sheets retain the actual cycle day, including days >43.
      if (page.offset) for (const y of [100, 479, 716, 839]) {
        ctx.fillStyle = '#fff'; ctx.fillRect(left + index * step + .6, y - 8, step - 1.2, 9);
        text(page.offset + index + 1, x - 4, y, 6);
      }
      for (const [, y, value] of TEMPLATE_ROWS) text(value(e), x - 4, y, 7, step - 1);
      if (e.isFertile) { ctx.fillStyle = 'rgba(55,130,70,.12)'; ctx.fillRect(left + index * step, 102, step, 321); }
      if (!Number.isFinite(e.temp)) { previous = null; return; }
      if (e.temp < 36 || e.temp > 37.4) { text(`${e.temp.toFixed(2)}`, x - 6, 116, 5, step); previous = null; return; }
      const y = tempY(e.temp);
      ctx.strokeStyle = '#111'; ctx.lineWidth = 1;
      if (previous) { ctx.beginPath(); ctx.moveTo(...previous); ctx.lineTo(x, y); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fillStyle = '#111'; ctx.fill(); previous = [x, y];
      const marker = e.markers?.bbt?.value;
      if (marker) text(marker, x + 2, y - 4, 6);
    });
    if (page.dates.length) {
      const anchor = (key, position) => left + ((Date.parse(key + 'T00:00:00Z') - Date.parse(page.dates[0] + 'T00:00:00Z')) / MILLISECONDS_PER_DAY + ({ start: 0, center: .5, end: 1 }[position] ?? .5)) * step;
      ctx.save(); ctx.beginPath(); ctx.rect(left, 102, step * 43, 321); ctx.clip(); ctx.strokeStyle = '#9b542e'; ctx.lineWidth = 1;
      for (const line of Object.values(map.coverlines || {})) {
        if (Number.isFinite(line.horizontalTemp)) { ctx.beginPath(); ctx.moveTo(line.horizontalStartKey ? anchor(line.horizontalStartKey, line.horizontalStartPosition) : left, tempY(line.horizontalTemp)); ctx.lineTo(line.horizontalEndKey ? anchor(line.horizontalEndKey, line.horizontalEndPosition) : 690.5, tempY(line.horizontalTemp)); ctx.stroke(); }
        if (line.verticalKey) { const x = anchor(line.verticalKey, line.verticalPosition); ctx.beginPath(); ctx.moveTo(x, tempY(line.verticalTopTemp ?? 37.4)); ctx.lineTo(x, tempY(line.verticalBottomTemp ?? 36)); ctx.stroke(); }
      }
      ctx.restore();
    }
    text(`${page.dates[0] || ''} – ${page.dates.at(-1) || ''}   ${pages.length + 1}`, 25, 984, 7);
    ctx.restore();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .96));
    if (!blob) throw new Error('PDF image failed');
    pages.push({ bytes: new Uint8Array(await blob.arrayBuffer()), width: canvas.width, height: canvas.height });
  }
  pages.push(...await mapPdfDetails(map));
  return jpegPagesPdf(pages, undefined, undefined, backup);
}

const RASTER_PAGE_WIDTH = 1684;
const RASTER_PAGE_HEIGHT = 1190;
const PAGE_MARGIN = 60;
const BODY_FONT_SIZE = 22;
const PAGE_BODY_START = 155;
const PAGE_BODY_BOTTOM = 1090;
const ENTRY_PAGE_BREAK_Y = 1000;
const BODY_LINE_HEIGHT = 30;
const ENTRY_SPACING = 20;
const BODY_TEXT_WIDTH = 1520;
const PAGE_JPEG_QUALITY = 0.94;

async function mapPdfDetails(map) {
  const canvas = document.createElement('canvas'); canvas.width = RASTER_PAGE_WIDTH; canvas.height = RASTER_PAGE_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas unavailable');
  const pages = []; let bodyY = 140;
  const drawText = (text, x, at, size = BODY_FONT_SIZE, color = '#253c32') => {
    context.font = `${size}px Arial, sans-serif`; context.fillStyle = color; context.fillText(String(text), x, at);
  };
  function startPage(subtitle) {
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = '30px Arial, sans-serif'; context.fillStyle = '#253c32';
    context.fillText(map.name || t('Untitled map'), PAGE_MARGIN, 65, 1560);
    drawText(subtitle, PAGE_MARGIN, 104, 20, '#63766a'); bodyY = PAGE_BODY_START;
  }
  async function finishPage() {
    drawText(`Cycle Tracker · ${pages.length + 1}`, PAGE_MARGIN, 1150, 18, '#63766a');
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', PAGE_JPEG_QUALITY));
    if (!blob) throw new Error('PDF image failed');
    pages.push(new Uint8Array(await blob.arrayBuffer()));
  }
  function wrapped(text, maxWidth = BODY_TEXT_WIDTH) {
    context.font = '22px Arial, sans-serif';
    const lines = []; let current = '';
    for (const char of String(text)) {
      if (char === '\n') { lines.push(current); current = ''; continue; }
      if (context.measureText(current + char).width > maxWidth) {
        const space = current.lastIndexOf(' ');
        lines.push(space > 0 ? current.slice(0, space) : current);
        current = space > 0 ? current.slice(space + 1) : '';
      }
      if (char !== '\n') current += char;
    }
    lines.push(current); return lines;
  }
  const entries = sortedMapEntries(map);
  startPage(t('Daily observations'));
  async function write(text) {
    for (const part of wrapped(text)) {
      if (bodyY > PAGE_BODY_BOTTOM) { await finishPage(); startPage(t('Daily observations')); }
      drawText(part, PAGE_MARGIN, bodyY); bodyY += BODY_LINE_HEIGHT;
    }
  }
  if (!entries.length) await write(t('No entries yet'));
  for (const [date, entry] of entries) {
    if (bodyY > ENTRY_PAGE_BREAK_Y) { await finishPage(); startPage(t('Daily observations')); }
    await write(date);
    const observations = [];
    for (const [index, key] of EXPORT_FIELDS.entries()) {
      if (entry[key] == null || entry[key] === '') continue;
      observations.push(`${t(EXPORT_LABELS[index])}: ${observationText(key, entry[key])}`);
    }
    await write(observations.join('  ·  '));
    bodyY += ENTRY_SPACING;
  }
  for (const line of Object.values(map.coverlines || {})) {
    const values = [];
    if (Number.isFinite(line.horizontalTemp)) values.push(`${t('Temperature')}: ${line.horizontalTemp.toFixed(2)} °C`);
    if (line.verticalKey) values.push(`${t('Date')}: ${line.verticalKey}`);
    if (line.horizontalStartKey || line.horizontalEndKey) values.push(`${line.horizontalStartKey || ''} – ${line.horizontalEndKey || ''}`);
    await write(`${t('Coverlines')}: ${values.join(' · ')}`);
  }
  if (map.fertileRange?.start) await write(`${t('Fertile range')}: ${map.fertileRange.start} — ${map.fertileRange.end || ''}`);
  await finishPage();
  return pages;
}
