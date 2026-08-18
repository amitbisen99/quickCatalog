const {
  parsePrice,
  parseImageUrls,
  parseSpecifications,
  parseMinimumOrderQuantity,
  parseTaxPercent,
} = require('./normalizeProductRow');

// Column headers must match products.controller.js's bulkImportSample
// template exactly — this is a fixed format (unlike the catalog-from-file
// wizard), so there's no column-mapping step for the vendor to do.
const HEADERS = {
  name: 'Product Name',
  sku: 'SKU',
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

  const moq = parseMinimumOrderQuantity(get('minimumOrderQuantity'));
  if (moq.error) {
    return { error: moq.error };
  }

  const tax = parseTaxPercent(get('taxPercent'));
  if (tax.error) {
    return { error: tax.error };
  }

  return {
    data: {
      name,
      sku: get('sku') || undefined,
      description: get('description'),
      price,
      unit: get('unit') || 'pcs',
      minimumOrderQuantity: moq.value,
      taxPercent: tax.value,
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
