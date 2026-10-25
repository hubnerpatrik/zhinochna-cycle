import { MAX_IMAGE_FILE_BYTES, IMAGE_OPEN_ERROR, encodeJpeg, isStoredJpeg, validateImageFile, withDecodedImage } from './image-utils.js';

export const MAX_PHOTO_FILE_BYTES = MAX_IMAGE_FILE_BYTES;
export const MAX_STORED_PHOTO_LENGTH = 60000;
const PHOTO_SIDE_LENGTH = 256;
const PHOTO_QUALITIES = [0.8, 0.6];
const IMAGE_HEADER_LENGTH = 12;
const JPEG_SIGNATURE = [255, 216, 255];
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const RIFF_SIGNATURE_END = 4;
const WEBP_SIGNATURE_START = 8;

// Stored photos are small, self-contained raster images; remote URLs and SVG are excluded.
export function isStoredProfilePhoto(value) {
  return value === '' || isStoredJpeg(value, MAX_STORED_PHOTO_LENGTH);
}

export async function prepareProfilePhoto(file) {
  validateImageFile(file);
  const header = new Uint8Array(await file.slice(0, IMAGE_HEADER_LENGTH).arrayBuffer());
  const matches = file.type === 'image/jpeg' ? JPEG_SIGNATURE.every((byte, index) => header[index] === byte)
    : file.type === 'image/png' ? PNG_SIGNATURE.every((byte, index) => header[index] === byte)
      : String.fromCharCode(...header.slice(0, RIFF_SIGNATURE_END)) === 'RIFF'
        && String.fromCharCode(...header.slice(WEBP_SIGNATURE_START, IMAGE_HEADER_LENGTH)) === 'WEBP';
  if (!matches) throw new Error('Choose a JPG, PNG or WebP image.');
  return withDecodedImage(file, image => {
    if (!image.naturalWidth || !image.naturalHeight) throw new Error(IMAGE_OPEN_ERROR);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = PHOTO_SIDE_LENGTH;
    const context = canvas.getContext('2d');
    if (!context) throw new Error(IMAGE_OPEN_ERROR);
    context.fillStyle = '#fff';
    context.fillRect(0, 0, PHOTO_SIDE_LENGTH, PHOTO_SIDE_LENGTH);
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2,
      side, side, 0, 0, PHOTO_SIDE_LENGTH, PHOTO_SIDE_LENGTH);
    return encodeJpeg(canvas, PHOTO_QUALITIES, isStoredProfilePhoto, IMAGE_OPEN_ERROR);
  });
}
