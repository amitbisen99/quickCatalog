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

  const resolvedEntries = [];
  data.imageFilenames.forEach((filename) => {
    const entry = zipEntries.get(filename.toLowerCase());
    if (entry) {
      resolvedEntries.push(entry);
    } else {
      warnings.push({ rowNumber, warning: `Image file "${filename}" not found in the uploaded ZIP` });
    }
  });

  // entry.getData() decompresses that one file right here, immediately
  // before compressing it down to its final small size — not upfront for
  // the whole ZIP (see readImagesZip), so memory only ever holds the
  // handful of images actually in flight for this row.
  return Promise.all(resolvedEntries.map((entry) => compressImageToDataUrl(entry.getData())));
}

module.exports = resolveRowImages;
