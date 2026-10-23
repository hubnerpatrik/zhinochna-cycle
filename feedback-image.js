import { encodeJpeg, isStoredJpeg, validateImageFile, withDecodedImage } from './image-utils.js';

export const MAX_FEEDBACK_IMAGE_LENGTH = 140000;
const MAX_SCREENSHOT_DIMENSION = 1280;
const SCREENSHOT_QUALITIES = [0.82, 0.65, 0.45, 0.25];

export function isFeedbackImage(value) {
  return isStoredJpeg(value, MAX_FEEDBACK_IMAGE_LENGTH);
}

export async function prepareFeedbackImage(file) {
  validateImageFile(file);
  return withDecodedImage(file, image => {
    const scale = Math.min(1, MAX_SCREENSHOT_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return encodeJpeg(canvas, SCREENSHOT_QUALITIES, isFeedbackImage, 'This screenshot is too large. Crop it and try again.');
  });
}
