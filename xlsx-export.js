// Minimal OOXML workbook: typed cells, Unicode text, no formulas or external links.
const encode = value => new TextEncoder().encode(value);
const xml = value => String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

const CRC_INITIAL_VALUE = 0xffffffff;
const CRC_POLYNOMIAL = 0xedb88320;
const BITS_PER_BYTE = 8;
const ALPHABET_SIZE = 26;
const FIRST_COLUMN_CHARACTER = 65;
const ZIP_VERSION = 20;
const ZIP_EPOCH_DATE = 33; // DOS date for 1980-01-01.
const LOCAL_HEADER = { SIZE: 30, SIGNATURE: 0x04034b50, VERSION: 4, DATE: 12, CRC: 14, COMPRESSED_SIZE: 18, SIZE_FIELD: 22, NAME_LENGTH: 26 };
const DIRECTORY_HEADER = { SIZE: 46, SIGNATURE: 0x02014b50, CREATED_VERSION: 4, REQUIRED_VERSION: 6, DATE: 14, CRC: 16, COMPRESSED_SIZE: 20, SIZE_FIELD: 24, NAME_LENGTH: 28, LOCAL_OFFSET: 42 };
const END_HEADER = { SIZE: 22, SIGNATURE: 0x06054b50, DISK_ENTRIES: 8, TOTAL_ENTRIES: 10, DIRECTORY_SIZE: 12, DIRECTORY_OFFSET: 16 };
const DIRECTORY_CHUNKS_PER_FILE = 2;

function crc32(bytes) {
  let crc = CRC_INITIAL_VALUE;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < BITS_PER_BYTE; bit++) crc = (crc >>> 1) ^ (crc & 1 ? CRC_POLYNOMIAL : 0);
  }
  return (crc ^ CRC_INITIAL_VALUE) >>> 0;
}

// ZIP's stored method avoids compression/runtime dependencies for these small files.
function zip(files) {
  const chunks = [], central = [];
  let offset = 0;
  for (const [path, text] of Object.entries(files)) {
    const name = encode(path), data = encode(text), crc = crc32(data);
    const header = new Uint8Array(LOCAL_HEADER.SIZE), view = new DataView(header.buffer);
    view.setUint32(0, LOCAL_HEADER.SIGNATURE, true); view.setUint16(LOCAL_HEADER.VERSION, ZIP_VERSION, true);
    view.setUint16(LOCAL_HEADER.DATE, ZIP_EPOCH_DATE, true);
    view.setUint32(LOCAL_HEADER.CRC, crc, true);
    view.setUint32(LOCAL_HEADER.COMPRESSED_SIZE, data.length, true); view.setUint32(LOCAL_HEADER.SIZE_FIELD, data.length, true);
    view.setUint16(LOCAL_HEADER.NAME_LENGTH, name.length, true);
    const directory = new Uint8Array(DIRECTORY_HEADER.SIZE), entry = new DataView(directory.buffer);
    entry.setUint32(0, DIRECTORY_HEADER.SIGNATURE, true);
    entry.setUint16(DIRECTORY_HEADER.CREATED_VERSION, ZIP_VERSION, true); entry.setUint16(DIRECTORY_HEADER.REQUIRED_VERSION, ZIP_VERSION, true);
    entry.setUint16(DIRECTORY_HEADER.DATE, ZIP_EPOCH_DATE, true); entry.setUint32(DIRECTORY_HEADER.CRC, crc, true);
    entry.setUint32(DIRECTORY_HEADER.COMPRESSED_SIZE, data.length, true); entry.setUint32(DIRECTORY_HEADER.SIZE_FIELD, data.length, true);
    entry.setUint16(DIRECTORY_HEADER.NAME_LENGTH, name.length, true); entry.setUint32(DIRECTORY_HEADER.LOCAL_OFFSET, offset, true);
    chunks.push(header, name, data); central.push(directory, name);
    offset += header.length + name.length + data.length;
  }
  const size = central.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = new Uint8Array(END_HEADER.SIZE), view = new DataView(end.buffer);
  view.setUint32(0, END_HEADER.SIGNATURE, true);
  view.setUint16(END_HEADER.DISK_ENTRIES, central.length / DIRECTORY_CHUNKS_PER_FILE, true);
  view.setUint16(END_HEADER.TOTAL_ENTRIES, central.length / DIRECTORY_CHUNKS_PER_FILE, true);
  view.setUint32(END_HEADER.DIRECTORY_SIZE, size, true); view.setUint32(END_HEADER.DIRECTORY_OFFSET, offset, true);
  const output = new Uint8Array(offset + size + end.length);
  let outputOffset = 0;
  [...chunks, ...central, end].forEach(chunk => { output.set(chunk, outputOffset); outputOffset += chunk.length; });
  return output;
}

function columnName(index) {
  let name = '';
  for (let columnNumber = index + 1; columnNumber; columnNumber = Math.floor((columnNumber - 1) / ALPHABET_SIZE)) {
    name = String.fromCharCode(FIRST_COLUMN_CHARACTER + (columnNumber - 1) % ALPHABET_SIZE) + name;
  }
  return name;
}

export function workbookBytes(rows) {
  const main = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const relationships = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const office = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const rowXml = rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => {
    const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
    if (value == null) return `<c r="${ref}"/>`;
    if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}"><v>${value}</v></c>`;
    if (typeof value === 'boolean') return `<c r="${ref}" t="b"><v>${Number(value)}</v></c>`;
    const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(text)}</t></is></c>`;
  }).join('')}</row>`).join('');
  return zip({
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    '_rels/.rels': `<Relationships xmlns="${relationships}"><Relationship Id="rId1" Type="${office}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<workbook xmlns="${main}" xmlns:r="${office}"><sheets><sheet name="Cycle map" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<Relationships xmlns="${relationships}"><Relationship Id="rId1" Type="${office}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    'xl/worksheets/sheet1.xml': `<worksheet xmlns="${main}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>${rowXml}</sheetData><autoFilter ref="A1:${columnName(rows[0].length - 1)}${rows.length}"/></worksheet>`,
  });
}
