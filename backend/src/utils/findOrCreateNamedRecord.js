/**
 * Finds a vendor-scoped record by case-insensitive name on the given
 * Mongoose model, creating it if needed. Shared implementation behind
 * findOrCreateCategory and findOrCreateSpecification — both models are
 * shaped the same way ({ vendorId, name }), so this is the one place
 * the actual find-or-create logic lives.
 */
async function findOrCreateNamedRecord(Model, vendorId, name, cache) {
  const key = name.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let record = await Model.findOne({ vendorId, name: new RegExp(`^${escaped}$`, 'i') });
  if (!record) {
    record = await Model.create({ vendorId, name });
  }
  cache.set(key, record._id);
  return record._id;
}

module.exports = findOrCreateNamedRecord;
