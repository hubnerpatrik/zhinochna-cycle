import { t } from './i18n.js';
import { EXPORT_FIELDS, EXPORT_LABELS, observationText, sortedMapEntries } from './export-data.js';
import { ISO_DATE_KEY_LENGTH, MILLISECONDS_PER_DAY } from './date-utils.js';

const PDF_PAGE_WIDTH = 842;
const PDF_PAGE_HEIGHT = 595;
const RASTER_PAGE_WIDTH = 1684;
const RASTER_PAGE_HEIGHT = 1190;
const MAX_CONTINUOUS_MAP_DAYS = 730;
const DAYS_PER_CHART_PAGE = 28;
const CHART_MIN_TEMPERATURE = 36;
const CHART_MAX_TEMPERATURE = 37.4;
const CHART_TEMPERATURE_SPAN = 1.4;
const CHART_TEMPERATURE_STEP = 0.05;
const CHART_GRID_INTERVALS = 28;
const CHART_LEFT = 145;
const CHART_TOP = 190;
const CHART_BOTTOM = 790;
const CHART_WIDTH = 1480;
const CHART_RIGHT = 1625;
const PAGE_MARGIN = 60;
const BODY_FONT_SIZE = 22;
const PAGE_BODY_START = 155;
const PAGE_BODY_BOTTOM = 1090;
const ENTRY_PAGE_BREAK_Y = 1000;
const BODY_LINE_HEIGHT = 30;
const ENTRY_SPACING = 20;
const BODY_TEXT_WIDTH = 1520;
const PAGE_JPEG_QUALITY = 0.94;
const PDF_OBJECTS_PER_PAGE = 3;
const FIRST_PAGE_OBJECT_ID = 3;
const PDF_OFFSET_DIGITS = 10;

// Each page is a high-resolution JPEG. Canvas preserves Czech/Ukrainian glyphs
// without a remote font dependency. PDF object offsets are counted in bytes.
export function jpegPagesPdf(pages, width = RASTER_PAGE_WIDTH, height = RASTER_PAGE_HEIGHT) {
  const encode = text => new TextEncoder().encode(text);
  const chunks = [], offsets = [0]; let length = 0;
  const push = value => { const bytes = typeof value === 'string' ? encode(value) : value; chunks.push(bytes); length += bytes.length; };
  const object = (id, content) => { offsets[id] = length; push(`${id} 0 obj\n`); push(content); push('\nendobj\n'); };
  push('%PDF-1.4\n');
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, index) => `${FIRST_PAGE_OBJECT_ID + index * PDF_OBJECTS_PER_PAGE} 0 R`).join(' ')}] >>`);
  pages.forEach((bytes, index) => {
    const id = FIRST_PAGE_OBJECT_ID + index * PDF_OBJECTS_PER_PAGE;
    object(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] /Resources << /XObject << /Im ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R >>`);
    offsets[id + 1] = length;
    push(`${id + 1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`);
    push(bytes); push('\nendstream\nendobj\n');
    const stream = `q ${PDF_PAGE_WIDTH} 0 0 ${PDF_PAGE_HEIGHT} 0 0 cm /Im Do Q`;
    object(id + 2, `<< /Length ${encode(stream).length} >>\nstream\n${stream}\nendstream`);
  });
  const start = length;
  push(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  offsets.slice(1).forEach(offset => push(`${String(offset).padStart(PDF_OFFSET_DIGITS, '0')} 00000 n \n`));
  push(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`);
  const output = new Uint8Array(length); let outputOffset = 0;
  chunks.forEach(chunk => { output.set(chunk, outputOffset); outputOffset += chunk.length; });
  return output;
}

export async function mapPdf(map) {
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
      if (char === '\n' || context.measureText(current + char).width > maxWidth) { lines.push(current); current = ''; }
      if (char !== '\n') current += char;
    }
    lines.push(current); return lines;
  }
  const entries = sortedMapEntries(map);
  // Keep actual calendar spacing and missing measurements as gaps.
  const dates = [];
  if (entries.length) {
    const end = Date.parse(entries.at(-1)[0] + 'T12:00:00Z');
    for (let time = Date.parse(entries[0][0] + 'T12:00:00Z'); time <= end && dates.length <= MAX_CONTINUOUS_MAP_DAYS; time += MILLISECONDS_PER_DAY) dates.push(new Date(time).toISOString().slice(0, ISO_DATE_KEY_LENGTH));
  }
  // Very sparse multi-year maps are exported as recorded dates, labelled explicitly.
  const chartDates = dates.length <= MAX_CONTINUOUS_MAP_DAYS ? dates : entries.map(([date]) => date);
  for (let offset = 0; offset < chartDates.length; offset += DAYS_PER_CHART_PAGE) {
    const slice = chartDates.slice(offset, offset + DAYS_PER_CHART_PAGE);
    startPage(`${t('Temperature')} · °C · ${slice[0]} — ${slice.at(-1)}`);
    const left = CHART_LEFT, top = CHART_TOP, bottom = CHART_BOTTOM, step = CHART_WIDTH / slice.length;
    const tempY = temp => bottom - (temp - CHART_MIN_TEMPERATURE) / CHART_TEMPERATURE_SPAN * (bottom - top);
    slice.forEach((date, index) => {
      if (map.entries[date]?.isFertile) { context.fillStyle = '#e6f2e7'; context.fillRect(left + index * step, top, step, bottom - top); }
    });
    for (let gridIndex = 0; gridIndex <= CHART_GRID_INTERVALS; gridIndex++) {
      const temp = CHART_MIN_TEMPERATURE + gridIndex * CHART_TEMPERATURE_STEP, at = tempY(temp);
      context.strokeStyle = gridIndex % 2 ? '#e9eeeb' : '#c9d8cf'; context.lineWidth = 1; context.beginPath(); context.moveTo(left, at); context.lineTo(CHART_RIGHT, at); context.stroke();
      if (gridIndex % 2 === 0) drawText(temp.toFixed(2), 64, at + 7, 19);
    }
    let previous = null;
    slice.forEach((date, index) => {
      const x = left + (index + .5) * step, entry = map.entries[date];
      context.strokeStyle = '#e0e8e3'; context.beginPath(); context.moveTo(left + index * step, top); context.lineTo(left + index * step, bottom); context.stroke();
      context.save(); context.translate(x + 5, bottom + 20); context.rotate(Math.PI / 2); drawText(date, 0, 0, 18); context.restore();
      if (!Number.isFinite(entry?.temp)) { previous = null; return; }
      // Preserve the fixed PDF scale when exporting newly supported high readings.
      if (entry.temp > CHART_MAX_TEMPERATURE || entry.temp < CHART_MIN_TEMPERATURE) {
        const high = entry.temp > CHART_MAX_TEMPERATURE;
        drawText(`${high ? '↑' : '↓'} ${entry.temp.toFixed(2)}°`, x - 25, high ? top + 25 : bottom - 15, 18, '#b43c45');
        previous = null;
        return;
      }
      const at = tempY(entry.temp);
      context.strokeStyle = '#315f4b'; context.lineWidth = 3;
      if (previous) { context.beginPath(); context.moveTo(...previous); context.lineTo(x, at); context.stroke(); }
      context.fillStyle = '#315f4b'; context.beginPath(); context.arc(x, at, 5, 0, Math.PI * 2); context.fill(); previous = [x, at];
    });
    const anchorX = (date, position = 'center') => {
      const day = (Date.parse(date + 'T12:00:00Z') - Date.parse(slice[0] + 'T12:00:00Z')) / MILLISECONDS_PER_DAY;
      return left + (day + ({ start: 0, center: .5, end: 1 }[position] ?? .5)) * step;
    };
    if (dates.length <= MAX_CONTINUOUS_MAP_DAYS) {
      context.save(); context.beginPath(); context.rect(left, top, CHART_WIDTH, bottom - top); context.clip();
      context.strokeStyle = '#ae6531'; context.lineWidth = 3; context.setLineDash([10, 6]);
      for (const coverline of Object.values(map.coverlines || {})) {
        if (Number.isFinite(coverline.horizontalTemp)) {
          context.beginPath();
          context.moveTo(coverline.horizontalStartKey ? anchorX(coverline.horizontalStartKey, coverline.horizontalStartPosition) : left, tempY(coverline.horizontalTemp));
          context.lineTo(coverline.horizontalEndKey ? anchorX(coverline.horizontalEndKey, coverline.horizontalEndPosition) : CHART_RIGHT, tempY(coverline.horizontalTemp)); context.stroke();
        }
        if (coverline.verticalKey) {
          const x = anchorX(coverline.verticalKey, coverline.verticalPosition);
          context.beginPath(); context.moveTo(x, tempY(coverline.verticalTopTemp ?? CHART_MAX_TEMPERATURE)); context.lineTo(x, tempY(coverline.verticalBottomTemp ?? CHART_MIN_TEMPERATURE)); context.stroke();
        }
      }
      context.restore();
    }
    slice.forEach((date, index) => {
      const entry = map.entries[date];
      ['bbt', 'mucus', 'cervix'].forEach((kind, row) => {
        const marker = entry?.markers?.[kind]?.value;
        if (marker) drawText(marker, left + (index + .5) * step - 5, 936 + row * 23, 18, ['#315f4b', '#2f649b', '#ae6531'][row]);
      });
    });
    drawText(t('Recorded temperatures · green columns: manually marked fertile days'), PAGE_MARGIN, 1000, 21);
    drawText(t('Complete observations and manual annotations follow on the next pages.'), PAGE_MARGIN, 1025, 21);
    if (dates.length > MAX_CONTINUOUS_MAP_DAYS) drawText(t('Sparse map: only recorded dates are shown.'), PAGE_MARGIN, 1065, 21);
    await finishPage();
  }
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
  if (Object.keys(map.coverlines || {}).length) await write(`${t('Coverlines')}: ${JSON.stringify(map.coverlines)}`);
  if (map.fertileRange?.start) await write(`${t('Fertile range')}: ${map.fertileRange.start} — ${map.fertileRange.end || ''}`);
  await finishPage();
  return jpegPagesPdf(pages);
}
