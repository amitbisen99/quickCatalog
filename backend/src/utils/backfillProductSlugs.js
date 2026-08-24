const Product = require('../models/Product');
const generateUniqueProductSlug = require('./generateUniqueProductSlug');

/**
 * One-time-per-product backfill: assigns a slug to every product created
 * before the slug field existed (there's no way to reach into production's
 * database directly from here, so this runs itself automatically instead).
 * Idempotent and safe to leave running on every boot — the query only
 * ever matches products that still have no slug, so once everything's
 * backfilled this is a fast no-op find that returns nothing. Also
 * self-heals if a product ever ends up slug-less again for any other
 * reason.
 */
async function backfillProductSlugs() {
  const products = await Product.find({ slug: { $exists: false } }, '_id vendorId name');
  if (products.length === 0) return;

  // eslint-disable-next-line no-console
  console.log(`Backfilling slugs for ${products.length} product(s)...`);

  // Slugs only need to be unique per vendor, so track "used this run" per
  // vendor rather than as one global set — mirrors the same in-batch
  // dedup generateUniqueProductSlug already does for a single import.
  const usedSlugsByVendor = new Map();

  for (const product of products) {
    const vendorKey = String(product.vendorId);
    if (!usedSlugsByVendor.has(vendorKey)) usedSlugsByVendor.set(vendorKey, new Set());
    // eslint-disable-next-line no-await-in-loop
    const slug = await generateUniqueProductSlug(product.vendorId, product.name, usedSlugsByVendor.get(vendorKey));
    // eslint-disable-next-line no-await-in-loop
    await Product.updateOne({ _id: product._id }, { slug });
  }

  // eslint-disable-next-line no-console
  console.log(`Backfilled ${products.length} product slug(s).`);
}

module.exports = backfillProductSlugs;
