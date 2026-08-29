// Column labels for the downloadable bulk-import sample template
// (product.controller.js's bulkImportSample). These are just a
// starting point for the vendor, not a strict requirement — the actual
// import (bulkImportProducts) maps columns by name via fieldMappings,
// same as the catalog-from-file wizard, so a differently-named column
// still works.
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

module.exports = { HEADERS };
