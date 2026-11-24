import { getAdjustedTemp } from './core.js';
import { jpegPagesPdf } from './pdf-document.js';
export { jpegPagesPdf } from './pdf-document.js';
import { t } from './i18n.js';
import { EXPORT_FIELDS, EXPORT_LABELS, exportDay, observationText, sortedMapEntries } from './export-data.js';
import { cycleModel } from './cycle-model.js';
import { MILLISECONDS_PER_DAY } from './date-utils.js';
import { templatePages } from './observation-template.js';
import { serializeMapBackup } from './backup.js';
import { calculateSummary } from './cycle-summary.js';
import { drawFormChoices, drawTemplateLabels, formCodes } from './pdf-template-labels.js';
import { FORM_ROWS, formDate, formMonth, formYear, isOtherMeasurementTime } from './pdf-form-rows.js';

// Entries are written onto the reference card in one pen colour, like its filled-in sample.
const ENTRY_INK = '#1f4e9e';
const PRINT_INK = '#111';
// Day grid of the card (714 × 1011 page space).
const GRID_LEFT = 129.5;
const GRID_RIGHT = 690.5;
const GRID_DAYS = 43;
const CHART_TOP = 102;
const CHART_BOTTOM = 423;
const FERTILE_ROW_Y = 834.3;
const OTHER_TIME_STRIP = 30;

export async function mapPdf(map, backup = serializeMapBackup(map)) {
  const image = new Image();
  image.src = new URL('./assets/observation-template.png', import.meta.url).href;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = 1428; canvas.height = 2022;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const pages = [];
  const model = cycleModel(map);
  const profile = map.profileSnapshot || {};
  const rowContext = { codes: formCodes(), usualTime: profile.usualMeasurementTime };
  const step = (GRID_RIGHT - GRID_LEFT) / GRID_DAYS;
  const tempY = temp => 417.4 - (temp - 36) / 1.4 * 310.7;
  const write = (value, x, y, { size = 8, bold = true, align = 'center', max = 60, color = ENTRY_INK } = {}) => {
    if (value == null || value === '') return;
    ctx.font = `${bold ? 'bold ' : ''}${size}px Arial, sans-serif`;
    ctx.fillStyle = color; ctx.textAlign = align;
    ctx.fillText(String(value), x, y, max);
    ctx.textAlign = 'left';
  };
  const vertical = (value, x, y, options) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.PI / 2);
    write(value, 0, 0, { align: 'left', ...options });
    ctx.restore();
  };
  for (const page of templatePages(map)) {
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.scale(2, 2);
    drawTemplateLabels(ctx);
    drawFormChoices(ctx, profile.measurementMethod, ENTRY_INK);
    write(map.name || t('Untitled map'), 72, 59.2, { align: 'left', max: 84 });
    write(formMonth(page.dates), 284, 59.2, { max: 100 });
    write(formYear(page.dates), 440.8, 59.2, { max: 80 });
    write(profile.age, 574, 59.2, { max: 52 });
    write(map.name, 220.5, 872.5, { size: 7.5, max: 52 });
    write(profile.usualMeasurementTime, 460.5, 888.3, { max: 42 });
    const manual = map.cycleSummaries?.[page.start] || {};
    const summary = page.start ? calculateSummary(map.entries, page.start, manual) : {};
    for (const [value, x, row] of [
      [summary.max, 264.5, 0], [summary.min, 264.5, 1], [summary.lastInfertile, 264.5, 2], [summary.length, 264.5, 3],
      [manual.firstMucus, 474.5, 0], [manual.qualityMucus, 474.5, 1], [manual.qualityDays, 474.5, 2], [manual.mucusPeak, 474.5, 3],
      [summary.bbtRise, 658.5, 0], [summary.mucusPlus4, 658.5, 1], [summary.cervixPlus4, 658.5, 2], [summary.bbtPhase, 593.5, 3], [summary.mucusPhase, 658.5, 3],
    ]) write(value, x, 913.6 + row * 13, { max: 38 });
    const days = page.dates.map((date, index) => ({ date, index, e: exportDay(model, map.entries, date), x: GRID_LEFT + (index + .5) * step }));
    for (const { date, index, e, x } of days) {
      vertical(formDate(date), x + 2.3, 87.5, { size: 6.5, bold: false, max: 22 });
      // Continuation sheets retain the actual cycle day, including days >43.
      if (page.offset) for (const y of [100, 479, 716, 839]) {
        ctx.fillStyle = '#fff'; ctx.fillRect(GRID_LEFT + index * step + .6, y - 8, step - 1.2, 9);
        write(page.offset + index + 1, x, y, { size: 6, color: PRINT_INK });
      }
      for (const [, y, value] of FORM_ROWS) write(value(e, rowContext), x, y, { size: 7.5, max: step - 1 });
      if (e.isFertile) {
        ctx.strokeStyle = ENTRY_INK; ctx.lineWidth = .8;
        ctx.beginPath(); ctx.arc(x, FERTILE_ROW_Y, 4.9, 0, Math.PI * 2); ctx.stroke();
      }
      // A reading taken at another time gets its time written up the day's column, as on the sample card.
      if (isOtherMeasurementTime(e.measurementTime, profile.usualMeasurementTime)) {
        const pointY = Number.isFinite(e.temp) ? tempY(Math.min(37.4, Math.max(36, e.temp))) : CHART_BOTTOM;
        const top = pointY < CHART_TOP + OTHER_TIME_STRIP + 6 ? CHART_BOTTOM - OTHER_TIME_STRIP - .6 : CHART_TOP + .6;
        ctx.fillStyle = '#fff'; ctx.fillRect(GRID_LEFT + index * step + .7, top, step - 1.4, OTHER_TIME_STRIP);
        vertical(e.measurementTime, x + 2.6, top + OTHER_TIME_STRIP - 2, { size: 7, max: OTHER_TIME_STRIP - 3 });
      }
    }
    let previous = null;
    for (const { e, x } of days) {
      if (!Number.isFinite(e.temp)) { previous = null; continue; }
      if (e.temp < 36 || e.temp > 37.4) { write(e.temp.toFixed(2), x, 116, { size: 5, bold: false, max: step }); previous = null; continue; }
      const y = tempY(e.temp);
      ctx.strokeStyle = PRINT_INK; ctx.lineWidth = 1;
      if (previous) { ctx.beginPath(); ctx.moveTo(...previous); ctx.lineTo(x, y); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fillStyle = PRINT_INK; ctx.fill(); previous = [x, y];
      const adjusted = getAdjustedTemp(e.temp, e.measurementTime, profile.usualMeasurementTime);
      if (adjusted != null) {
        const adjustedY = tempY(Math.min(37.4, Math.max(36, adjusted)));
        ctx.save();
        ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = .8;
        ctx.setLineDash([2, 2]);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, adjustedY); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(x, adjustedY, 1.6, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      const marker = e.markers?.bbt?.value;
      if (marker) write(marker, x + 4, y - 4, { size: 6, align: 'left' });
    }
    if (page.dates.length) {
      const anchor = (key, position) => GRID_LEFT + ((Date.parse(key + 'T00:00:00Z') - Date.parse(page.dates[0] + 'T00:00:00Z')) / MILLISECONDS_PER_DAY + ({ start: 0, center: .5, end: 1 }[position] ?? .5)) * step;
      ctx.save(); ctx.beginPath(); ctx.rect(GRID_LEFT, CHART_TOP, step * GRID_DAYS, CHART_BOTTOM - CHART_TOP); ctx.clip(); ctx.strokeStyle = '#9b542e'; ctx.lineWidth = 1;
      for (const line of Object.values(map.coverlines || {})) {
        if (Number.isFinite(line.horizontalTemp)) { ctx.beginPath(); ctx.moveTo(line.horizontalStartKey ? anchor(line.horizontalStartKey, line.horizontalStartPosition) : GRID_LEFT, tempY(line.horizontalTemp)); ctx.lineTo(line.horizontalEndKey ? anchor(line.horizontalEndKey, line.horizontalEndPosition) : GRID_RIGHT, tempY(line.horizontalTemp)); ctx.stroke(); }
        if (line.verticalKey) { const x = anchor(line.verticalKey, line.verticalPosition); ctx.beginPath(); ctx.moveTo(x, tempY(line.verticalTopTemp ?? 37.4)); ctx.lineTo(x, tempY(line.verticalBottomTemp ?? 36)); ctx.stroke(); }
      }
      ctx.restore();
    }
    write(`${page.dates[0] || ''} – ${page.dates.at(-1) || ''}   ${pages.length + 1}`, 25, 984, { size: 7, bold: false, align: 'left', max: 300, color: '#666' });
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
