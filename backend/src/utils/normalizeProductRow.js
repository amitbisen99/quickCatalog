// Matches a number token (with optional comma thousands-separators and a
// decimal part) anywhere in the string, ignoring surrounding currency
// symbols/text. A naive "strip everything but digits and dots" approach
// breaks on abbreviations like "Rs." — the period gets mistaken for a
// decimal point (e.g. "Rs. 1,999" -> "1.999" -> 1.999 instead of 1999).
const NUMBER_PATTERN = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/;

/** Extracts and parses a finite, non-negative number from a messy price string. */
function parsePrice(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const match = String(raw).match(NUMBER_PATTERN);
  if (!match) return null;
  const value = parseFloat(match[0].replace(/,/g, ''));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/** Parses a whole-number Minimum Order Quantity of at least 1. */
function parseMinimumOrderQuantity(raw) {
  if (!raw) return {};
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return { error: 'Minimum Order Quantity must be a whole number of at least 1' };
  }
  return { value: parsed };
}

/** Parses a tax percentage between 0 and 100. */
function parseTaxPercent(raw) {
  if (!raw) return {};
  const parsed = parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return { error: 'Tax % must be a number between 0 and 100' };
  }
  return { value: parsed };
}

/** Splits on comma/semicolon/pipe/newline, trims, drops blanks, caps at 3. */
function parseImageUrls(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[,;|\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
}

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

/**
 * Applies the vendor's field mappings to one parsed Excel row and
 * validates it. No AI — plain rules for the fields that actually need
 * parsing (price), everything else is a direct/trimmed passthrough.
 */
function normalizeProductRow(record, fieldMappings) {
  const get = (field) => {
    const column = fieldMappings[field];
    if (!column) return '';
    const value = record[column];
    return value === undefined || value === null ? '' : String(value).trim();
  };

  const name = get('productName');
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
      // resolved by the controller, which is the only place that has the
      // ZIP's contents. Mirrors normalizeBulkProductRow.js's same split.
      images: parseImageUrls(get('imageUrl')),
      imageFilenames: parseImageUrls(get('imageFilename')),
      video: get('videoUrl'),
      categoryName: get('category') || null,
      specifications: parseSpecifications(get('specifications')),
    },
  };
}

module.exports = {
  normalizeProductRow,
  parsePrice,
  parseImageUrls,
  parseSpecifications,
  parseMinimumOrderQuantity,
  parseTaxPercent,
};
