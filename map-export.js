import { t } from './i18n.js';
import { TEMP_FACTORS } from './core.js';

export const EXPORT_FIELDS = [
  'temp', 'measurementTime', 'tempFactors', 'bleeding', 'sediment', 'sensation',
  'stretch', 'visible', 'consistency', 'color', 'colorOther', 'cervixFirmness',
  'cervixHeight', 'cervixOpenness', 'sex', 'other', 'isFertile', 'isPeak',
  'markers', 'crossedRows', 'crossedChartTemps',
];
const labels = ['Temperature', 'Measurement time', 'Influence factors', 'Bleeding', 'Clots', 'Sensation',
  'Slippery', 'Discharge', 'Consistency', 'Color', 'Other color', 'Firmness', 'Height', 'Openness',
  'Sex', 'Notes', 'Fertile range', 'Peak', 'Markers', 'Crossed rows', 'Crossed temperatures'];
const valueText = value => value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
const enumLabels = { none: 'None', spotting: 'Spotting', menstruation: 'Period', dry: 'Dry', moist: 'Moist', wet: 'Wet',
  creamy: 'Creamy', slightlyStretchy: 'Slightly stretchy', stretchy: 'Stretchy', white: 'White',
  whiteTranslucent: 'White-translucent', translucent: 'Translucent', other: 'Other', hard: 'Hard', soft: 'Soft',
  low: 'Low', medium: 'Medium', high: 'High', closed: 'Closed', open: 'Open' };
export function observationText(key, value) {
  if (value == null) return '';
  if (key === 'temp' && Number.isFinite(value)) return `${value.toFixed(2)} °C`;
  if (typeof value === 'boolean') return t(value ? 'Yes' : 'No');
  if (key === 'tempFactors') return t(TEMP_FACTORS[value] || value);
  if (['bleeding', 'sensation', 'consistency', 'color', 'cervixFirmness', 'cervixHeight', 'cervixOpenness'].includes(key)) return t(enumLabels[value] || value);
  if (key === 'markers') return Object.entries(value).filter(([, marker]) => marker.value).map(([type, marker]) => `${type.toUpperCase()}: ${marker.value} (${marker.pointType})`).join(', ') || '—';
  return valueText(value);
}

export function csvCell(value) {
  let text = valueText(value);
  // Prevent spreadsheet formulas, including those hidden behind whitespace.
  if (/^[\s\uFEFF]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function mapCsv(map) {
  const rows = [['date', ...EXPORT_FIELDS], ...Object.entries(map.entries || {}).sort(([a], [b]) => a.localeCompare(b))
    .map(([date, entry]) => [date, ...EXPORT_FIELDS.map(key => entry[key])])];
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
export function exportFilename(name, extension) {
  return `${(name || 'cycle-map').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/[. ]+$/g, '').slice(0, 80) || 'cycle-map'}.${extension}`;
}
export function downloadFile(contents, type, filename) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Each page is a high-resolution JPEG. Canvas preserves Czech/Ukrainian glyphs
// without a remote font dependency. PDF object offsets are counted in bytes.
export function jpegPagesPdf(pages, width = 1684, height = 1190) {
  const encode = text => new TextEncoder().encode(text);
  const chunks = [], offsets = [0]; let length = 0;
  const push = value => { const bytes = typeof value === 'string' ? encode(value) : value; chunks.push(bytes); length += bytes.length; };
  const object = (id, content) => { offsets[id] = length; push(`${id} 0 obj\n`); push(content); push('\nendobj\n'); };
  push('%PDF-1.4\n');
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] >>`);
  pages.forEach((bytes, index) => {
    const id = 3 + index * 3;
    object(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R >>`);
    offsets[id + 1] = length;
    push(`${id + 1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`);
    push(bytes); push('\nendstream\nendobj\n');
    const stream = 'q 842 0 0 595 0 0 cm /Im Do Q';
    object(id + 2, `<< /Length ${encode(stream).length} >>\nstream\n${stream}\nendstream`);
  });
  const start = length;
  push(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  offsets.slice(1).forEach(offset => push(`${String(offset).padStart(10, '0')} 00000 n \n`));
  push(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`);
  const output = new Uint8Array(length); let at = 0;
  chunks.forEach(chunk => { output.set(chunk, at); at += chunk.length; });
  return output;
}

export async function mapPdf(map) {
  const canvas = document.createElement('canvas'); canvas.width = 1684; canvas.height = 1190;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const pages = []; let y = 140;
  const line = (text, x, at, size = 22, color = '#253c32') => {
    ctx.font = `${size}px Arial, sans-serif`; ctx.fillStyle = color; ctx.fillText(String(text), x, at);
  };
  function startPage(subtitle) {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = '30px Arial, sans-serif'; ctx.fillStyle = '#253c32';
    ctx.fillText(map.name || t('Untitled map'), 60, 65, 1560);
    line(subtitle, 60, 104, 20, '#63766a'); y = 155;
  }
  async function finishPage() {
    line(`Cycle Tracker · ${pages.length + 1}`, 60, 1150, 18, '#63766a');
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .94));
    if (!blob) throw new Error('PDF image failed');
    pages.push(new Uint8Array(await blob.arrayBuffer()));
  }
  function wrapped(text, maxWidth = 1520) {
    ctx.font = '22px Arial, sans-serif';
    const lines = []; let current = '';
    for (const char of String(text)) {
      if (char === '\n' || ctx.measureText(current + char).width > maxWidth) { lines.push(current); current = ''; }
      if (char !== '\n') current += char;
    }
    lines.push(current); return lines;
  }
  const entries = Object.entries(map.entries || {}).sort(([a], [b]) => a.localeCompare(b));
  // Keep actual calendar spacing and missing measurements as gaps.
  const dates = [];
  if (entries.length) {
    const end = Date.parse(entries.at(-1)[0] + 'T12:00:00Z');
    for (let time = Date.parse(entries[0][0] + 'T12:00:00Z'); time <= end && dates.length <= 730; time += 86400000) dates.push(new Date(time).toISOString().slice(0, 10));
  }
  // Very sparse multi-year maps are exported as recorded dates, labelled explicitly.
  const chartDates = dates.length <= 730 ? dates : entries.map(([date]) => date);
  for (let offset = 0; offset < chartDates.length; offset += 28) {
    const slice = chartDates.slice(offset, offset + 28);
    startPage(`${t('Temperature')} · °C · ${slice[0]} — ${slice.at(-1)}`);
    const left = 145, top = 190, bottom = 790, step = 1480 / slice.length;
    const tempY = temp => bottom - (temp - 36) / 1.4 * (bottom - top);
    slice.forEach((date, index) => {
      if (map.entries[date]?.isFertile) { ctx.fillStyle = '#e6f2e7'; ctx.fillRect(left + index * step, top, step, bottom - top); }
    });
    for (let n = 0; n <= 28; n++) {
      const temp = 36 + n * .05, at = tempY(temp);
      ctx.strokeStyle = n % 2 ? '#e9eeeb' : '#c9d8cf'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(left, at); ctx.lineTo(1625, at); ctx.stroke();
      if (n % 2 === 0) line(temp.toFixed(2), 64, at + 7, 19);
    }
    let previous = null;
    slice.forEach((date, index) => {
      const x = left + (index + .5) * step, entry = map.entries[date];
      ctx.strokeStyle = '#e0e8e3'; ctx.beginPath(); ctx.moveTo(left + index * step, top); ctx.lineTo(left + index * step, bottom); ctx.stroke();
      ctx.save(); ctx.translate(x + 5, bottom + 20); ctx.rotate(Math.PI / 2); line(date, 0, 0, 18); ctx.restore();
      if (!Number.isFinite(entry?.temp)) { previous = null; return; }
      const at = tempY(entry.temp);
      ctx.strokeStyle = '#315f4b'; ctx.lineWidth = 3;
      if (previous) { ctx.beginPath(); ctx.moveTo(...previous); ctx.lineTo(x, at); ctx.stroke(); }
      ctx.fillStyle = '#315f4b'; ctx.beginPath(); ctx.arc(x, at, 5, 0, Math.PI * 2); ctx.fill(); previous = [x, at];
    });
    const anchorX = (date, position = 'center') => {
      const day = (Date.parse(date + 'T12:00:00Z') - Date.parse(slice[0] + 'T12:00:00Z')) / 86400000;
      return left + (day + ({ start: 0, center: .5, end: 1 }[position] ?? .5)) * step;
    };
    if (dates.length <= 730) {
      ctx.save(); ctx.beginPath(); ctx.rect(left, top, 1480, bottom - top); ctx.clip();
      ctx.strokeStyle = '#ae6531'; ctx.lineWidth = 3; ctx.setLineDash([10, 6]);
      for (const coverline of Object.values(map.coverlines || {})) {
        if (Number.isFinite(coverline.horizontalTemp)) {
          ctx.beginPath();
          ctx.moveTo(coverline.horizontalStartKey ? anchorX(coverline.horizontalStartKey, coverline.horizontalStartPosition) : left, tempY(coverline.horizontalTemp));
          ctx.lineTo(coverline.horizontalEndKey ? anchorX(coverline.horizontalEndKey, coverline.horizontalEndPosition) : 1625, tempY(coverline.horizontalTemp)); ctx.stroke();
        }
        if (coverline.verticalKey) {
          const x = anchorX(coverline.verticalKey, coverline.verticalPosition);
          ctx.beginPath(); ctx.moveTo(x, tempY(coverline.verticalTopTemp ?? 37.4)); ctx.lineTo(x, tempY(coverline.verticalBottomTemp ?? 36)); ctx.stroke();
        }
      }
      ctx.restore();
    }
    slice.forEach((date, index) => {
      const entry = map.entries[date];
      ['bbt', 'mucus', 'cervix'].forEach((kind, row) => {
        const marker = entry?.markers?.[kind]?.value;
        if (marker) line(marker, left + (index + .5) * step - 5, 936 + row * 23, 18, ['#315f4b', '#2f649b', '#ae6531'][row]);
      });
    });
    line(t('Recorded temperatures · green columns: manually marked fertile days'), 60, 1000, 21);
    line(t('Complete observations and manual annotations follow on the next pages.'), 60, 1025, 21);
    if (dates.length > 730) line(t('Sparse map: only recorded dates are shown.'), 60, 1065, 21);
    await finishPage();
  }
  startPage(t('Daily observations'));
  async function write(text) {
    for (const part of wrapped(text)) {
      if (y > 1090) { await finishPage(); startPage(t('Daily observations')); }
      line(part, 60, y); y += 30;
    }
  }
  if (!entries.length) await write(t('No entries yet'));
  for (const [date, entry] of entries) {
    if (y > 1000) { await finishPage(); startPage(t('Daily observations')); }
    await write(date);
    const observations = [];
    for (const [index, key] of EXPORT_FIELDS.entries()) {
      if (entry[key] == null || entry[key] === '') continue;
      observations.push(`${t(labels[index])}: ${observationText(key, entry[key])}`);
    }
    await write(observations.join('  ·  '));
    y += 20;
  }
  if (Object.keys(map.coverlines || {}).length) await write(`${t('Coverlines')}: ${JSON.stringify(map.coverlines)}`);
  if (map.fertileRange?.start) await write(`${t('Fertile range')}: ${map.fertileRange.start} — ${map.fertileRange.end || ''}`);
  await finishPage();
  return jpegPagesPdf(pages);
}
