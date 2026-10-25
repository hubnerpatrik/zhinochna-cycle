import { workbookBytes } from './xlsx-export.js';
import { mapExportRows, valueText, EXPORT_FIELDS, EXPORT_LABELS, observationText, sortedMapEntries } from './export-data.js';
import { mapBackupPayload } from './map-transfer.js';
import { t } from './i18n.js';

export { EXPORT_FIELDS, observationText } from './export-data.js';
export { jpegPagesPdf, mapPdf } from './pdf-export.js';

export { downloadFile } from './browser-download.js';

const MAX_EXPORT_FILENAME_LENGTH = 80;

export function csvCell(value) {
  let text = valueText(value);
  // Prevent spreadsheet formulas, including those hidden behind whitespace.
  if (/^[\s\uFEFF]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function mapCsv(map) {
  const rows = mapExportRows(map);
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
export function mapXlsx(map, backup = mapBackupPayload(map)) {
  const rows = [[t('Date'), ...EXPORT_LABELS.map(t)], ...sortedMapEntries(map).map(([date, entry]) => [date, ...EXPORT_FIELDS.map(key => {
    const value = entry[key];
    return typeof value === 'string' ? observationText(key, value) : value;
  })])];
  return workbookBytes(rows, map, backup);
}
export function exportFilename(name, extension) {
  return `${(name || 'cycle-map').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/[. ]+$/g, '').slice(0, MAX_EXPORT_FILENAME_LENGTH) || 'cycle-map'}.${extension}`;
}
