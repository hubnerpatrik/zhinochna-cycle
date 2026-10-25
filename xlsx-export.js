// Minimal OOXML workbook: typed cells, Unicode text, no formulas or external links.
import { zipTextFiles } from './zip-archive.js';
import { addObservationSheets } from './xlsx-template.js';

const ALPHABET_SIZE = 26;
const FIRST_COLUMN_CHARACTER = 65;
const SPREADSHEET_NAMESPACE = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const RELATIONSHIPS_NAMESPACE = 'http://schemas.openxmlformats.org/package/2006/relationships';
const OFFICE_RELATIONSHIPS_NAMESPACE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const escapeXml = value => String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function columnName(index) {
  let name = '';
  for (let columnNumber = index + 1; columnNumber; columnNumber = Math.floor((columnNumber - 1) / ALPHABET_SIZE)) {
    name = String.fromCharCode(FIRST_COLUMN_CHARACTER + (columnNumber - 1) % ALPHABET_SIZE) + name;
  }
  return name;
}

function cellXml(value, reference) {
  if (value == null) return `<c r="${reference}"/>`;
  if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${reference}"><v>${value}</v></c>`;
  if (typeof value === 'boolean') return `<c r="${reference}" t="b"><v>${Number(value)}</v></c>`;
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
}

function worksheetRowsXml(rows) {
  return rows.map((row, rowIndex) => {
    const rowNumber = rowIndex + 1;
    const cells = row.map((value, columnIndex) => cellXml(value, `${columnName(columnIndex)}${rowNumber}`)).join('');
    return `<row r="${rowNumber}">${cells}</row>`;
  }).join('');
}

export function workbookBytes(rows, map = null, backup = '') {
  const rowXml = worksheetRowsXml(rows);
  const files = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    '_rels/.rels': `<Relationships xmlns="${RELATIONSHIPS_NAMESPACE}"><Relationship Id="rId1" Type="${OFFICE_RELATIONSHIPS_NAMESPACE}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<workbook xmlns="${SPREADSHEET_NAMESPACE}" xmlns:r="${OFFICE_RELATIONSHIPS_NAMESPACE}"><bookViews><workbookView/></bookViews><sheets><sheet name="Cycle map" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<Relationships xmlns="${RELATIONSHIPS_NAMESPACE}"><Relationship Id="rId1" Type="${OFFICE_RELATIONSHIPS_NAMESPACE}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    'xl/worksheets/sheet1.xml': `<worksheet xmlns="${SPREADSHEET_NAMESPACE}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>${rowXml}</sheetData><autoFilter ref="A1:${columnName(rows[0].length - 1)}${rows.length}"/></worksheet>`,
  };
  return zipTextFiles(map ? addObservationSheets(files, map, backup) : files);
}
