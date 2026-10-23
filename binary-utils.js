export function concatenateBytes(chunks) {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  chunks.forEach(chunk => {
    output.set(chunk, offset);
    offset += chunk.length;
  });
  return output;
}
