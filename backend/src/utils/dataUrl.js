const DATA_URL_PATTERN = /^data:([^;]+);base64,(.+)$/;

/**
 * Splits a "data:image/jpeg;base64,..." string (the format
 * compressImageToDataUrl produces) back into a real Buffer + its mime
 * type — needed anywhere the image has to be served as an actual HTTP
 * resource rather than rendered inline in an <img src>, e.g. Open Graph
 * tags, which social-media crawlers fetch directly and don't resolve
 * data: URIs for.
 */
function parseDataUrl(dataUrl) {
  const match = typeof dataUrl === 'string' ? dataUrl.match(DATA_URL_PATTERN) : null;
  if (!match) return null;
  return { mimeType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

module.exports = { parseDataUrl };
