import { workbookBytes } from './xlsx-export.js';
import { mapExportRows, valueText } from './export-data.js';

export { EXPORT_FIELDS, observationText } from './export-data.js';
export { jpegPagesPdf, mapPdf } from './pdf-export.js';

const MAX_EXPORT_FILENAME_LENGTH = 80;
const DOWNLOAD_URL_LIFETIME_MS = 60_000;

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
export function downloadFile(contents, type, filename) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_URL_LIFETIME_MS);
}
