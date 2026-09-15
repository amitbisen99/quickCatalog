export interface MappableField {
  key: string;
  label: string;
  required?: boolean;
}

// Every column the backend's create-from-file/bulk-import endpoints know
// how to read (matches fuzzyMapHeaders.ts's FIELD_SYNONYMS keys) — shared
// by ColumnMappingTable.tsx and both Excel-upload wizards
// (dashboard/catalogs/create.tsx, dashboard/products/bulk-import.tsx) so
// the field list/order/labels can't drift between them.
export const MAPPABLE_FIELDS: MappableField[] = [
  { key: 'productName', label: 'Product Name', required: true },
  { key: 'price', label: 'Price', required: true },
  { key: 'sku', label: 'SKU' },
  { key: 'description', label: 'Description' },
  { key: 'category', label: 'Category' },
  { key: 'unit', label: 'Unit' },
  { key: 'minimumOrderQuantity', label: 'Minimum Order Quantity' },
  { key: 'specifications', label: 'Specifications' },
  { key: 'taxPercent', label: 'Tax %' },
  { key: 'imageFilename', label: 'Image Filename' },
  { key: 'imageUrl', label: 'Image URL' },
  { key: 'videoUrl', label: 'Video URL' },
];
