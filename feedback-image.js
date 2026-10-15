export const MAX_FEEDBACK_IMAGE_LENGTH = 140000;
export function isFeedbackImage(value) {
  return typeof value === 'string' && value.length <= MAX_FEEDBACK_IMAGE_LENGTH
    && /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(value)
    && (value.length - 23) % 4 === 0;
}

export async function prepareFeedbackImage(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw Error('Choose a JPG, PNG or WebP image.');
  if (!file.size || file.size > 10 * 1024 * 1024) throw Error('Choose an image smaller than 10 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url;
    try { await image.decode(); } catch { throw Error('This image could not be opened. Choose another file.'); }
    const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [.82, .65, .45, .25]) {
      const data = canvas.toDataURL('image/jpeg', quality);
      if (isFeedbackImage(data)) return data;
    }
    throw Error('This screenshot is too large. Crop it and try again.');
  } finally { URL.revokeObjectURL(url); }
}
