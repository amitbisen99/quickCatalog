const Category = require('../models/Category');
const findOrCreateNamedRecord = require('./findOrCreateNamedRecord');

/**
 * Finds a vendor's category by case-insensitive name, creating it if
 * needed. Shared by every bulk-import path (catalog-from-file,
 * product bulk import) so "Electronics" and "electronics" in a sheet
 * resolve to the same category instead of creating duplicates.
 */
function findOrCreateCategory(vendorId, name, cache) {
  return findOrCreateNamedRecord(Category, vendorId, name, cache);
}

module.exports = findOrCreateCategory;
