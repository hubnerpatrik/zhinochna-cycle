import { concatenateBytes } from './binary-utils.js';

const encodeText = value => new TextEncoder().encode(value);

const CRC_INITIAL_VALUE = 0xffffffff;
const CRC_POLYNOMIAL = 0xedb88320;
const BITS_PER_BYTE = 8;
const SIGNATURE_OFFSET = 0;
const ZIP_VERSION = 20;
const ZIP_EPOCH_DATE = 33; // DOS date for 1980-01-01.
const LOCAL_HEADER = { SIZE: 30, SIGNATURE: 0x04034b50, VERSION: 4, DATE: 12, CRC: 14, COMPRESSED_SIZE: 18, SIZE_FIELD: 22, NAME_LENGTH: 26 };
const DIRECTORY_HEADER = { SIZE: 46, SIGNATURE: 0x02014b50, CREATED_VERSION: 4, REQUIRED_VERSION: 6, DATE: 14, CRC: 16, COMPRESSED_SIZE: 20, SIZE_FIELD: 24, NAME_LENGTH: 28, LOCAL_OFFSET: 42 };
const END_HEADER = { SIZE: 22, SIGNATURE: 0x06054b50, DISK_ENTRIES: 8, TOTAL_ENTRIES: 10, DIRECTORY_SIZE: 12, DIRECTORY_OFFSET: 16 };

function crc32(bytes) {
  let crc = CRC_INITIAL_VALUE;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bitIndex = 0; bitIndex < BITS_PER_BYTE; bitIndex++) {
      crc = (crc >>> 1) ^ (crc & 1 ? CRC_POLYNOMIAL : 0);
    }
  }
  return (crc ^ CRC_INITIAL_VALUE) >>> 0;
}

function localFileHeader(nameLength, dataLength, checksum) {
  const header = new Uint8Array(LOCAL_HEADER.SIZE);
  const fields = new DataView(header.buffer);
  fields.setUint32(SIGNATURE_OFFSET, LOCAL_HEADER.SIGNATURE, true);
  fields.setUint16(LOCAL_HEADER.VERSION, ZIP_VERSION, true);
  fields.setUint16(LOCAL_HEADER.DATE, ZIP_EPOCH_DATE, true);
  fields.setUint32(LOCAL_HEADER.CRC, checksum, true);
  fields.setUint32(LOCAL_HEADER.COMPRESSED_SIZE, dataLength, true);
  fields.setUint32(LOCAL_HEADER.SIZE_FIELD, dataLength, true);
  fields.setUint16(LOCAL_HEADER.NAME_LENGTH, nameLength, true);
  return header;
}

function directoryFileHeader(nameLength, dataLength, checksum, localOffset) {
  const header = new Uint8Array(DIRECTORY_HEADER.SIZE);
  const fields = new DataView(header.buffer);
  fields.setUint32(SIGNATURE_OFFSET, DIRECTORY_HEADER.SIGNATURE, true);
  fields.setUint16(DIRECTORY_HEADER.CREATED_VERSION, ZIP_VERSION, true);
  fields.setUint16(DIRECTORY_HEADER.REQUIRED_VERSION, ZIP_VERSION, true);
  fields.setUint16(DIRECTORY_HEADER.DATE, ZIP_EPOCH_DATE, true);
  fields.setUint32(DIRECTORY_HEADER.CRC, checksum, true);
  fields.setUint32(DIRECTORY_HEADER.COMPRESSED_SIZE, dataLength, true);
  fields.setUint32(DIRECTORY_HEADER.SIZE_FIELD, dataLength, true);
  fields.setUint16(DIRECTORY_HEADER.NAME_LENGTH, nameLength, true);
  fields.setUint32(DIRECTORY_HEADER.LOCAL_OFFSET, localOffset, true);
  return header;
}

function endOfDirectoryHeader(fileCount, directorySize, directoryOffset) {
  const header = new Uint8Array(END_HEADER.SIZE);
  const fields = new DataView(header.buffer);
  fields.setUint32(SIGNATURE_OFFSET, END_HEADER.SIGNATURE, true);
  fields.setUint16(END_HEADER.DISK_ENTRIES, fileCount, true);
  fields.setUint16(END_HEADER.TOTAL_ENTRIES, fileCount, true);
  fields.setUint32(END_HEADER.DIRECTORY_SIZE, directorySize, true);
  fields.setUint32(END_HEADER.DIRECTORY_OFFSET, directoryOffset, true);
  return header;
}

// ZIP's stored method avoids compression/runtime dependencies for these small files.
export function zipTextFiles(files) {
  const fileChunks = [];
  const directoryChunks = [];
  const fileEntries = Object.entries(files);
  let directoryOffset = 0;
  fileEntries.forEach(([path, text]) => {
    const nameBytes = encodeText(path);
    const dataBytes = encodeText(text);
    const checksum = crc32(dataBytes);
    const header = localFileHeader(nameBytes.length, dataBytes.length, checksum);
    const directory = directoryFileHeader(nameBytes.length, dataBytes.length, checksum, directoryOffset);
    fileChunks.push(header, nameBytes, dataBytes);
    directoryChunks.push(directory, nameBytes);
    directoryOffset += header.length + nameBytes.length + dataBytes.length;
  });
  const directorySize = directoryChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const endHeader = endOfDirectoryHeader(fileEntries.length, directorySize, directoryOffset);
  return concatenateBytes([...fileChunks, ...directoryChunks, endHeader]);
}

