import { serializeBackup } from './backup.js';

// The same validated backup travels inside all three export formats.
export function mapBackupPayload(map) {
  const id = map.id || 'exported-map';
  return serializeBackup({ profile: map.profileSnapshot || {}, maps: { [id]: { ...map, id } }, activeMapId: id });
}

export const PDF_BACKUP_START = '\n%CYCLE-TRACKER-DATA-BEGIN\n';
export const PDF_BACKUP_END = '\n%CYCLE-TRACKER-DATA-END\n';

export async function readMapImport(file) {
  const extension = file.name.toLowerCase().split('.').at(-1);
  if (extension === 'json') return file.text();
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length > 50 * 1024 * 1024) throw new Error('Soubor pro import je příliš velký (maximum 50 MB).');
  if (extension === 'pdf') {
    const text = new TextDecoder().decode(bytes);
    const start = text.lastIndexOf(PDF_BACKUP_START);
    const end = text.indexOf(PDF_BACKUP_END, start);
    if (start >= 0 && end > start) return text.slice(start + PDF_BACKUP_START.length, end).split('\n').map(line => line.replace(/^%/, '')).join('\n');
    throw new Error('Toto PDF neobsahuje data pro import. Vyberte PDF exportované touto aplikací. Starší PDF a skeny vyžadují ruční přepis.');
  }
  if (extension === 'xlsx') {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    // Read the central directory, so ZIP data descriptors are supported too.
    let end = bytes.length - 22;
    while (end >= Math.max(0, bytes.length - 65557) && view.getUint32(end, true) !== 0x06054b50) end--;
    if (end < Math.max(0, bytes.length - 65557)) throw new Error('Neplatný soubor Excel.');
    let offset = view.getUint32(end + 16, true);
    const count = view.getUint16(end + 10, true);
    for (let index = 0; index < count; index++) {
      if (view.getUint32(offset, true) !== 0x02014b50) throw new Error('Neplatný soubor Excel.');
      const nameLength = view.getUint16(offset + 28, true);
      const name = new TextDecoder().decode(bytes.slice(offset + 46, offset + 46 + nameLength));
      if (name === 'cycle-map.json') {
        const method = view.getUint16(offset + 10, true);
        const size = view.getUint32(offset + 20, true);
        const local = view.getUint32(offset + 42, true);
        const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
        if (start + size > bytes.length || view.getUint32(offset + 24, true) > 10 * 1024 * 1024) throw new Error('Neplatná velikost dat importu.');
        const data = bytes.slice(start, start + size);
        if (method === 0) return new TextDecoder().decode(data);
        if (method === 8) return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
        throw new Error('Nepodporovaná komprese souboru Excel.');
      }
      offset += 46 + nameLength + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
    }
    throw new Error('Tento Excel neobsahuje data pro import. Vyberte původní Excel exportovaný touto aplikací.');
  }
  throw new Error('Podporované formáty importu: JSON, PDF a Excel (.xlsx).');
}
