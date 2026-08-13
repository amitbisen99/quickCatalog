const { compressImageToDataUrl } = require('./imageProcessor');

/**
 * Image URL wins if present; Image Filename is only resolved against an
 * uploaded ZIP as a fallback when no URL was given for that row. Shared by
 * catalog.controller.js's createFromFile and product.controller.js's
 * bulkImportProducts — both accept the same Excel + optional-ZIP shape.
 *
 * Pushes a warning (not an error — the row still imports, just without
 * that image) onto `warnings` for a missing ZIP or an unmatched filename.
 * Returns the resolved images array; when no fallback is needed this is
 * just `data.images` unchanged.
 */
async function resolveRowImages(data, zipEntries, rowNumber, warnings) {
  if (data.images.length > 0 || data.imageFilenames.length === 0) {
    return data.images;
  }

  if (!zipEntries) {
    warnings.push({ rowNumber, warning: 'Image Filename given but no images ZIP was uploaded' });
    return data.images;
  }

  const resolvedBuffers = [];
  data.imageFilenames.forEach((filename) => {
    const buffer = zipEntries.get(filename.toLowerCase());
    if (buffer) {
      resolvedBuffers.push(buffer);
    } else {
      warnings.push({ rowNumber, warning: `Image file "${filename}" not found in the uploaded ZIP` });
    }
  });

  return Promise.all(resolvedBuffers.map((buffer) => compressImageToDataUrl(buffer)));
}

module.exports = resolveRowImages;
