import { workbookBytes } from './xlsx-export.js';
import { mapExportRows, valueText } from './export-data.js';

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
export function mapXlsx(map) {
  return workbookBytes(mapExportRows(map));
}
export function exportFilename(name, extension) {
  return `${(name || 'cycle-map').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/[. ]+$/g, '').slice(0, MAX_EXPORT_FILENAME_LENGTH) || 'cycle-map'}.${extension}`;
}
