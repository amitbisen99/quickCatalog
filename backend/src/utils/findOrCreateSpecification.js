const Specification = require('../models/Specification');
const findOrCreateNamedRecord = require('./findOrCreateNamedRecord');

/**
 * Finds a vendor's specification master entry by case-insensitive name,
 * creating it if needed — same role as findOrCreateCategory but for the
 * Specification collection. Products don't store this id (specification
 * values live on the product keyed by name directly); this just keeps
 * the vendor's specification list in sync so new keys typed into a bulk
 * import sheet show up in the Specifications page and future dropdowns.
 */
function findOrCreateSpecification(vendorId, name, cache) {
  return findOrCreateNamedRecord(Specification, vendorId, name, cache);
}

module.exports = findOrCreateSpecification;
