export const MAX_PHOTO_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_STORED_PHOTO_LENGTH = 60000;
const types = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Stored photos are small, self-contained raster images; remote URLs and SVG are excluded.
export function isStoredProfilePhoto(value) {
  return typeof value === 'string' && (value === '' || (value.length <= MAX_STORED_PHOTO_LENGTH
    && /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(value)
    && (value.length - 'data:image/jpeg;base64,'.length) % 4 === 0));
}

export async function prepareProfilePhoto(file) {
  if (!file || !types.has(file.type)) throw new Error('Choose a JPG, PNG or WebP image.');
  if (!file.size || file.size > MAX_PHOTO_FILE_BYTES) throw new Error('Choose an image smaller than 10 MB.');
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const matches = file.type === 'image/jpeg' ? header[0] === 255 && header[1] === 216 && header[2] === 255
    : file.type === 'image/png' ? [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => header[i] === byte)
      : String.fromCharCode(...header.slice(0, 4)) === 'RIFF' && String.fromCharCode(...header.slice(8, 12)) === 'WEBP';
  if (!matches) throw new Error('Choose a JPG, PNG or WebP image.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try { await image.decode(); } catch { throw new Error('This image could not be opened. Choose another file.'); }
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('This image could not be opened. Choose another file.');
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This image could not be opened. Choose another file.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, 256, 256);
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 256, 256);
    let photo = canvas.toDataURL('image/jpeg', .8);
    if (!isStoredProfilePhoto(photo)) photo = canvas.toDataURL('image/jpeg', .6);
    if (!isStoredProfilePhoto(photo)) throw new Error('This image could not be opened. Choose another file.');
    return photo;
  } finally { URL.revokeObjectURL(url); }
}
