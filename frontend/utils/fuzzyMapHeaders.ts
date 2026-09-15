// Plain keyword matching — no AI. Good enough to pre-fill sensible
// defaults; the vendor can always override any dropdown.
const FIELD_SYNONYMS: Record<string, string[]> = {
  productName: ['product name', 'name', 'title', 'item', 'item name', 'product'],
  sku: ['sku', 'sku code', 'product sku', 'product code', 'item code', 'item sku'],
  description: ['description', 'details', 'desc', 'about'],
  price: ['price', 'cost', 'rate', 'mrp', 'amount', 'unit price'],
  unit: ['unit', 'uom', 'measure', 'unit of measure'],
  minimumOrderQuantity: ['minimum order quantity', 'moq', 'min order qty', 'min qty', 'minimum quantity'],
  category: ['category', 'cat', 'type', 'group'],
  specifications: ['specifications', 'specification', 'specs', 'spec'],
  // Raw synonyms are pre-normalized (lowercase, no punctuation) since
  // normalize() strips symbols like "%" from headers before comparing —
  // "Tax %" normalizes to "tax", so the synonym is just "tax".
  taxPercent: ['tax percent', 'tax', 'gst', 'gst percent', 'vat', 'vat percent'],
  imageFilename: ['image filename', 'photo filename', 'filename', 'file name', 'image file name', 'picture filename'],
  imageUrl: ['image', 'images', 'image url', 'image urls', 'photo', 'picture'],
  videoUrl: ['video', 'video url', 'video link'],
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// Two full passes over every field, rather than one field fully resolved
// (exact-match-else-fuzzy) before moving to the next. A single header
// named "Image" is an *exact* match for imageUrl's synonym list ('image'
// is literally in it) — but with a one-field-at-a-time pass, imageFilename
// gets first turn (object key order above) and *fuzzy*-claims "Image"
// first anyway, since "image" is a substring of its own "image filename"
// synonym. An exact match for any field must win over a fuzzy match
// claimed by an earlier-processed field, so every field's exact-match
// attempt runs before any field's fuzzy attempt.
export function autoMapHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const used = new Set<string>();

  for (const field of Object.keys(FIELD_SYNONYMS)) {
    const synonyms = FIELD_SYNONYMS[field];
    const match = headers.find((h) => !used.has(h) && synonyms.includes(normalize(h)));
    if (match) {
      mapping[field] = match;
      used.add(match);
    }
  }

  for (const field of Object.keys(FIELD_SYNONYMS)) {
    if (mapping[field]) continue;
    const synonyms = FIELD_SYNONYMS[field];
    const match = headers.find((h) => {
      if (used.has(h)) return false;
      const normalizedHeader = normalize(h);
      return synonyms.some((syn) => normalizedHeader.includes(syn) || syn.includes(normalizedHeader));
    });
    if (match) {
      mapping[field] = match;
      used.add(match);
    }
  }

  return mapping;
}
