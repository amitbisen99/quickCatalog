// Free-tier limits, centralized here so both numbers live in one place
// instead of scattered magic numbers across catalog/product controllers.
const FREE_CATALOG_LIMIT = 1;
const FREE_PRODUCT_LIMIT = 10;

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
