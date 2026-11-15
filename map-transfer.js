// map-transfer.js — Exporting one map and reading a map import
// ─────────────────────────────────────────────
// One module owns format choice, the embedded backup and import parsing,
// so the router only confirms and downloads.

import { backupFilename, parseMapBackup, serializeMapBackup } from './backup.js';
import { exportFilename, mapCsv, mapPdf, mapXlsx } from './map-export.js';
import { PDF_BACKUP_END, PDF_BACKUP_START } from './pdf-document.js';

const MAX_IMPORT_FILE_BYTES = 50 * 1024 * 1024;
const MAX_EMBEDDED_BACKUP_BYTES = 10 * 1024 * 1024;
const ZIP_END_RECORD = 0x06054b50;
const ZIP_CENTRAL_RECORD = 0x02014b50;
const ZIP_END_RECORD_SIZE = 22;
const ZIP_MAX_COMMENT_SEARCH = 65557;
const XLSX_BACKUP_PART = 'cycle-map.json';

export const MAP_EXPORT_FORMATS = Object.freeze(['json', 'pdf', 'xlsx', 'csv']);

/**
 * Builds one export file. Every format except CSV embeds the same backup, so
 * import restores the map exactly as it was exported.
 */
export async function exportMap(map, format, { accountProfile = {}, active = false, exportedAt } = {}) {
  const backup = () => serializeMapBackup(map, { accountProfile, active, exportedAt });
  switch (format) {
    case 'json':
      return { contents: backup(), mimeType: 'application/json', filename: backupFilename(new Date(), map.name) };
    case 'pdf':
      return { contents: await mapPdf(map, backup()), mimeType: 'application/pdf', filename: exportFilename(map.name, 'pdf') };
    case 'xlsx':
      return {
        contents: mapXlsx(map, backup()),
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: exportFilename(map.name, 'xlsx'),
      };
    case 'csv':
      return { contents: mapCsv(map), mimeType: 'text/csv;charset=utf-8', filename: exportFilename(map.name, 'csv') };
    default:
      throw new Error('Unsupported export format.');
  }
}

/** Reads a JSON, PDF or Excel export and returns its validated single-map backup state. */
export async function readMapImport(file) {
  return parseMapBackup(await readImportText(file));
}

/** The backup JSON embedded in an export file, before validation. */
export async function readImportText(file) {
  const extension = file.name.toLowerCase().split('.').at(-1);
  if (extension === 'json') return file.text();
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length > MAX_IMPORT_FILE_BYTES) throw new Error('The import file is too large (maximum 50 MB).');
  if (extension === 'pdf') return readPdfBackup(bytes);
  if (extension === 'xlsx') return readXlsxBackup(bytes);
  throw new Error('Supported import formats: JSON, PDF and Excel (.xlsx).');
}

function readPdfBackup(bytes) {
  const text = new TextDecoder().decode(bytes);
  const start = text.lastIndexOf(PDF_BACKUP_START);
  const end = text.indexOf(PDF_BACKUP_END, start);
  if (start >= 0 && end > start) {
    return text.slice(start + PDF_BACKUP_START.length, end).split('\n').map(line => line.replace(/^%/, '')).join('\n');
  }
  throw new Error('This PDF contains no import data. Choose a PDF exported by this app. Older PDFs and scans need manual re-entry.');
}

async function readXlsxBackup(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // Read the central directory, so ZIP data descriptors are supported too.
  const searchStart = Math.max(0, bytes.length - ZIP_MAX_COMMENT_SEARCH);
  let end = bytes.length - ZIP_END_RECORD_SIZE;
  while (end >= searchStart && view.getUint32(end, true) !== ZIP_END_RECORD) end--;
  if (end < searchStart) throw new Error('Invalid Excel file.');
  let offset = view.getUint32(end + 16, true);
  const count = view.getUint16(end + 10, true);
  for (let index = 0; index < count; index++) {
    if (view.getUint32(offset, true) !== ZIP_CENTRAL_RECORD) throw new Error('Invalid Excel file.');
    const nameLength = view.getUint16(offset + 28, true);
    const name = new TextDecoder().decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    if (name === XLSX_BACKUP_PART) {
      const method = view.getUint16(offset + 10, true);
      const size = view.getUint32(offset + 20, true);
      const local = view.getUint32(offset + 42, true);
      const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      if (start + size > bytes.length || view.getUint32(offset + 24, true) > MAX_EMBEDDED_BACKUP_BYTES) {
        throw new Error('Invalid import data size.');
      }
      const data = bytes.slice(start, start + size);
      if (method === 0) return new TextDecoder().decode(data);
      if (method === 8) return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
      throw new Error('Unsupported Excel compression.');
    }
    offset += 46 + nameLength + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
  }
  throw new Error('This Excel file contains no import data. Choose the original Excel file exported by this app.');
}
