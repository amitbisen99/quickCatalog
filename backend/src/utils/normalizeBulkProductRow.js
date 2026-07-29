const { parsePrice, parseImageUrls } = require('./normalizeProductRow');

// Column headers must match products.controller.js's bulkImportSample
// template exactly — this is a fixed format (unlike the catalog-from-file
// wizard), so there's no column-mapping step for the vendor to do.
const HEADERS = {
  name: 'Product Name',
  description: 'Description',
  price: 'Price',
  unit: 'Unit',
  minimumOrderQuantity: 'Minimum Order Quantity',
  category: 'Category',
  specifications: 'Specifications',
  taxPercent: 'Tax %',
  imageUrl: 'Image URL',
  imageFilename: 'Image Filename',
  videoUrl: 'Video URL',
};

/** Parses "Color: Red; Size: Large" into { Color: 'Red', Size: 'Large' }. A pair with no colon is dropped rather than failing the whole row. */
function parseSpecifications(raw) {
  if (!raw) return {};
  const result = {};
  String(raw)
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const idx = pair.indexOf(':');
      if (idx === -1) return;
      const key = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      if (key) result[key] = value;
    });
  return result;
}

function normalizeBulkProductRow(record) {
  const get = (key) => {
    const value = record[HEADERS[key]];
    return value === undefined || value === null ? '' : String(value).trim();
  };

  const name = get('name');
  if (!name) {
    return { error: 'Product name is required' };
  }

  const price = parsePrice(get('price'));
  if (price === null) {
    return { error: 'Price is missing or not a valid number' };
  }

  let minimumOrderQuantity;
  const moqRaw = get('minimumOrderQuantity');
  if (moqRaw) {
    const parsed = parseInt(moqRaw, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return { error: 'Minimum Order Quantity must be a whole number of at least 1' };
    }
    minimumOrderQuantity = parsed;
  }

  let taxPercent;
  const taxRaw = get('taxPercent');
  if (taxRaw) {
    const parsed = parseFloat(taxRaw);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      return { error: 'Tax % must be a number between 0 and 100' };
    }
    taxPercent = parsed;
  }

  return {
    data: {
      name,
      description: get('description'),
      price,
      unit: get('unit') || 'pcs',
      minimumOrderQuantity,
      taxPercent,
      // Image URL takes priority; Image Filename (matched against an
      // uploaded ZIP) is only used as a fallback when no URL is given —
      // resolved by the controller, which is the only place that has
      // the ZIP's contents.
      images: parseImageUrls(get('imageUrl')),
      imageFilenames: parseImageUrls(get('imageFilename')),
      video: get('videoUrl') || undefined,
      categoryName: get('category') || null,
      specifications: parseSpecifications(get('specifications')),
    },
  };
}

module.exports = { normalizeBulkProductRow, HEADERS };
