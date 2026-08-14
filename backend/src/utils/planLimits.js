// Free-tier limits, centralized here so both numbers live in one place
// instead of scattered magic numbers across catalog/product controllers.
// Temporarily raised while the app is in testing — drop back to the real
// launch limits (1 catalog / 10 products) before going live.
const FREE_CATALOG_LIMIT = 20;
const FREE_PRODUCT_LIMIT = 500;

/**
 * Whether adding `additionalCount` products to a catalog that already has
 * `existingCount` would exceed the free-tier per-catalog cap. Shared
 * comparison only — callers decide what to do about it (reject the whole
 * request, or truncate and report how many made it in), since that
 * response behavior legitimately differs by endpoint.
 */
function exceedsFreeProductLimit(user, existingCount, additionalCount) {
  return user.subscriptionType !== 'paid' && existingCount + additionalCount > FREE_PRODUCT_LIMIT;
}

module.exports = { FREE_CATALOG_LIMIT, FREE_PRODUCT_LIMIT, exceedsFreeProductLimit };
