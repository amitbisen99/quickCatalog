const { CLIENT_URL } = require('./clientUrl');

// Same APP_BASE_DOMAIN env var allowedOriginsCache.js already uses for
// the same reason — the root domain a vendor's subdomain gets built on
// top of, distinct from CLIENT_URL (which may itself be a full origin
// like https://instantcatalog.app).
const APP_BASE_DOMAIN = (process.env.APP_BASE_DOMAIN || '').replace(/\/+$/, '') || undefined;

/**
 * Server-side mirror of frontend/utils/catalogUrl.ts's getCatalogPublicUrl
 * — same white-label-domain-first precedence, needed here for building
 * links inside emails (lifecycle nudges, lead notifications) where there's
 * no browser-side AuthUser to read from.
 */
function getCatalogPublicUrl(slug, vendor) {
  if (vendor?.customDomainStatus === 'active' && vendor.customDomain) {
    return `https://${vendor.customDomain}/public/${slug}`;
  }
  if (vendor?.subdomainStatus === 'active' && vendor.subdomain && APP_BASE_DOMAIN) {
    return `https://${vendor.subdomain}.${APP_BASE_DOMAIN}/public/${slug}`;
  }
  return `${CLIENT_URL || ''}/public/${slug}`;
}

module.exports = { getCatalogPublicUrl };
