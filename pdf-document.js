import { concatenateBytes } from './binary-utils.js';
import { PDF_BACKUP_START, PDF_BACKUP_END } from './map-transfer.js';

const DEFAULT_IMAGE_WIDTH = 1684;
const DEFAULT_IMAGE_HEIGHT = 1190;
const PDF_PAGE_WIDTH = 842;
const PDF_PAGE_HEIGHT = 595;
const PDF_OBJECTS_PER_PAGE = 3;
const FIRST_PAGE_OBJECT_ID = 3;
const PDF_OFFSET_DIGITS = 10;
const CATALOG_OBJECT_ID = 1;
const PAGE_TREE_OBJECT_ID = 2;
const IMAGE_OBJECT_OFFSET = 1;
const CONTENT_OBJECT_OFFSET = 2;
const BITS_PER_COMPONENT = 8;

// Each page is a high-resolution JPEG. Canvas preserves Czech/Ukrainian glyphs
// without a remote font dependency. PDF object offsets are counted in bytes.
export function jpegPagesPdf(pages, width = DEFAULT_IMAGE_WIDTH, height = DEFAULT_IMAGE_HEIGHT, backup = '') {
  const encode = text => new TextEncoder().encode(text);
  const chunks = [];
  const offsets = [0];
  let length = 0;
  function appendBytes(value) {
    const bytes = typeof value === 'string' ? encode(value) : value;
    chunks.push(bytes);
    length += bytes.length;
  }
  function appendObject(id, content) {
    offsets[id] = length;
    appendBytes(`${id} 0 obj\n`);
    appendBytes(content);
    appendBytes('\nendobj\n');
  }
  appendBytes('%PDF-1.4\n');
  const attachmentId = FIRST_PAGE_OBJECT_ID + pages.length * PDF_OBJECTS_PER_PAGE;
  appendObject(CATALOG_OBJECT_ID, `<< /Type /Catalog /Pages 2 0 R${backup ? ` /Names << /EmbeddedFiles << /Names [(cycle-map.json) ${attachmentId} 0 R] >> >>` : ''} >>`);
  appendObject(PAGE_TREE_OBJECT_ID, `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, index) => `${FIRST_PAGE_OBJECT_ID + index * PDF_OBJECTS_PER_PAGE} 0 R`).join(' ')}] >>`);
  pages.forEach((page, index) => {
    const bytes = page.bytes || page;
    const imageWidth = page.width || width, imageHeight = page.height || height;
    const pageWidth = page.width ? 595 : PDF_PAGE_WIDTH, pageHeight = page.height ? 842 : PDF_PAGE_HEIGHT;
    const id = FIRST_PAGE_OBJECT_ID + index * PDF_OBJECTS_PER_PAGE;
    appendObject(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im ${id + IMAGE_OBJECT_OFFSET} 0 R >> >> /Contents ${id + CONTENT_OBJECT_OFFSET} 0 R >>`);
    offsets[id + IMAGE_OBJECT_OFFSET] = length;
    appendBytes(`${id + IMAGE_OBJECT_OFFSET} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent ${BITS_PER_COMPONENT} /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`);
    appendBytes(bytes); appendBytes('\nendstream\nendobj\n');
    const stream = `q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Im Do Q`;
    appendObject(id + CONTENT_OBJECT_OFFSET, `<< /Length ${encode(stream).length} >>\nstream\n${stream}\nendstream`);
  });
  if (backup) {
    appendObject(attachmentId, `<< /Type /Filespec /F (cycle-map.json) /EF << /F ${attachmentId + 1} 0 R >> >>`);
    appendObject(attachmentId + 1, `<< /Type /EmbeddedFile /Subtype /application#2Fjson /Length ${encode(backup).length} >>\nstream\n${backup}\nendstream`);
    // Comments keep the recovery copy inside the PDF, before its final xref/EOF.
    appendBytes(PDF_BACKUP_START + backup.split('\n').map(line => '%' + line).join('\n') + PDF_BACKUP_END);
  }
  const crossReferenceOffset = length;
  appendBytes(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  offsets.slice(1).forEach(offset => appendBytes(`${String(offset).padStart(PDF_OFFSET_DIGITS, '0')} 00000 n \n`));
  appendBytes(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${crossReferenceOffset}\n%%EOF\n`);
  return concatenateBytes(chunks);
}

