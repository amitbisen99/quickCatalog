// Plain keyword matching — no AI. Good enough to pre-fill sensible
// defaults; the vendor can always override any dropdown.
const FIELD_SYNONYMS: Record<string, string[]> = {
  productName: ['product name', 'name', 'title', 'item', 'item name', 'product'],
  description: ['description', 'details', 'desc', 'about'],
  price: ['price', 'cost', 'rate', 'mrp', 'amount', 'unit price'],
  category: ['category', 'cat', 'type', 'group'],
  unit: ['unit', 'uom', 'measure', 'unit of measure'],
  specifications: ['specifications', 'specification', 'specs', 'spec'],
  // Checked before imageUrl below — its own substring pass ("image" is one
  // of its synonyms) would otherwise swallow an "Image Filename" column
  // first, since object key order is the field-processing order here.
  imageFilename: ['image filename', 'photo filename', 'filename', 'file name', 'image file name', 'picture filename'],
  imageUrl: ['image', 'images', 'image url', 'image urls', 'photo', 'picture'],
  videoUrl: ['video', 'video url', 'video link'],
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function autoMapHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const used = new Set<string>();

  for (const field of Object.keys(FIELD_SYNONYMS)) {
    const synonyms = FIELD_SYNONYMS[field];

    let match = headers.find((h) => !used.has(h) && synonyms.includes(normalize(h)));

    if (!match) {
      match = headers.find((h) => {
        if (used.has(h)) return false;
        const normalizedHeader = normalize(h);
        return synonyms.some((syn) => normalizedHeader.includes(syn) || syn.includes(normalizedHeader));
      });
    }

    if (match) {
      mapping[field] = match;
      used.add(match);
    }
  }

  return mapping;
}
