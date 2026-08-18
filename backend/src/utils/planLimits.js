// Free-tier limits, centralized here so both numbers live in one place
// instead of scattered magic numbers across catalog/product controllers.
// Paid has no cap on either — every other feature is identical between
// the two plans.
const FREE_CATALOG_LIMIT = 1;
const FREE_PRODUCT_LIMIT = 10;

/**
 * Whether adding `additionalCount` products would push a vendor's total
 * product count (across their whole library — not just one catalog, since
 * a free vendor could otherwise dodge the cap by stockpiling unattached
 * library products) past the free-tier cap. Shared comparison only —
 * callers decide what to do about it (reject the whole request, or
 * truncate and report how many made it in), since that response behavior
 * legitimately differs by endpoint.
 */
function exceedsFreeProductLimit(user, existingCount, additionalCount) {
  return user.subscriptionType !== 'paid' && existingCount + additionalCount > FREE_PRODUCT_LIMIT;
}

module.exports = { FREE_CATALOG_LIMIT, FREE_PRODUCT_LIMIT, exceedsFreeProductLimit };
