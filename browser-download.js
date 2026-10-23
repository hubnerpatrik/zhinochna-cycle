const DOWNLOAD_URL_LIFETIME_MS = 60_000;

export function downloadFile(contents, type, filename, {
  urlLifetimeMs = DOWNLOAD_URL_LIFETIME_MS,
  attachToDocument = true,
} = {}) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  if (attachToDocument) document.body.appendChild(link);
  link.click();
  if (attachToDocument) link.remove();
  setTimeout(() => URL.revokeObjectURL(url), urlLifetimeMs);
}
