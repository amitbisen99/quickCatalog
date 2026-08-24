const Product = require('../models/Product');
const slugify = require('./slugify');

/**
 * Generates a URL-safe slug for a product, unique within that vendor's
 * own products (not globally — different vendors can both have a
 * "t-shirt" without colliding). Mirrors catalog.controller.js's
 * generateUniqueSlug, scoped per-vendor via the compound
 * { vendorId, slug } index instead of a global unique constraint.
 *
 * usedSlugs is an optional Set the caller maintains across a whole bulk
 * import — a single DB uniqueness check alone can't catch two identically-
 * named rows in the *same* not-yet-inserted batch (Excel bulk import,
 * create-from-file), so this checks both the DB and that in-flight set,
 * and adds its own result to it before returning.
 */
async function generateUniqueProductSlug(vendorId, name, usedSlugs) {
  const base = slugify(name, 'product');
  let slug = base;
  let suffix = 1;
  // eslint-disable-next-line no-await-in-loop
  while ((usedSlugs && usedSlugs.has(slug)) || (await Product.findOne({ vendorId, slug }))) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  if (usedSlugs) usedSlugs.add(slug);
  return slug;
}

module.exports = generateUniqueProductSlug;
