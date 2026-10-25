export const MAX_IMAGE_FILE_BYTES = 10 * 1024 * 1024;
export const JPEG_MIME_TYPE = 'image/jpeg';
export const IMAGE_OPEN_ERROR = 'This image could not be opened. Choose another file.';
const SUPPORTED_IMAGE_TYPES = new Set([JPEG_MIME_TYPE, 'image/png', 'image/webp']);
const JPEG_DATA_PREFIX = 'data:image/jpeg;base64,';
const JPEG_DATA_PATTERN = /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/;
const BASE64_BLOCK_LENGTH = 4;

export function isStoredJpeg(value, maximumLength) {
  return typeof value === 'string' && value.length <= maximumLength
    && JPEG_DATA_PATTERN.test(value)
    && (value.length - JPEG_DATA_PREFIX.length) % BASE64_BLOCK_LENGTH === 0;
}

export function validateImageFile(file) {
  if (!file || !SUPPORTED_IMAGE_TYPES.has(file.type)) throw new Error('Choose a JPG, PNG or WebP image.');
  if (!file.size || file.size > MAX_IMAGE_FILE_BYTES) throw new Error('Choose an image smaller than 10 MB.');
}

export async function withDecodedImage(file, processImage) {
  const imageUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = imageUrl;
    try { await image.decode(); } catch { throw new Error(IMAGE_OPEN_ERROR); }
    return await processImage(image);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export function encodeJpeg(canvas, qualities, acceptsImage, failureMessage) {
  // Stop at the first accepted quality; encoding every candidate is expensive.
  for (const quality of qualities) {
    const imageData = canvas.toDataURL(JPEG_MIME_TYPE, quality);
    if (acceptsImage(imageData)) return imageData;
  }
  throw new Error(failureMessage);
}
