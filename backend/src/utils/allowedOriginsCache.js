// CORS can't just check a static CLIENT_URL anymore — once a catalog has
// an active white-label domain, browser-side calls from that domain
// (analytics tracking, product detail fetch, the enquiry form — see
// frontend/utils/analytics.ts and the public catalog pages) need to be
// allowed too. Querying the DB on every single request would be wasteful,
// so this keeps an in-memory Set refreshed periodically instead — domain
// activation is already a multi-hour manual DNS process, so a brief
// staleness window here (at most REFRESH_INTERVAL_MS) is a non-issue.
const Catalog = require('../models/Catalog');

const REFRESH_INTERVAL_MS = 60 * 1000;
const APP_BASE_DOMAIN = process.env.APP_BASE_DOMAIN;

let cachedOrigins = new Set();

async function refresh() {
  try {
    const catalogs = await Catalog.find(
      { $or: [{ subdomainStatus: 'active' }, { customDomainStatus: 'active' }] },
      'subdomain subdomainStatus customDomain customDomainStatus'
    ).lean();

    const next = new Set();
    for (const catalog of catalogs) {
      if (catalog.subdomainStatus === 'active' && catalog.subdomain && APP_BASE_DOMAIN) {
        next.add(`https://${catalog.subdomain}.${APP_BASE_DOMAIN}`);
      }
      if (catalog.customDomainStatus === 'active' && catalog.customDomain) {
        next.add(`https://${catalog.customDomain}`);
      }
    }
    cachedOrigins = next;
  } catch (err) {
    // Non-fatal — keep serving whatever was cached before rather than
    // locking every white-label domain out of the API over a transient
    // DB hiccup. The next interval tick will retry.
    // eslint-disable-next-line no-console
    console.error('Failed to refresh allowed-origins cache:', err.message);
  }
}

function isOriginAllowed(origin) {
  return cachedOrigins.has(origin);
}

function startAllowedOriginsRefresh() {
  refresh(); // don't wait for the first interval tick after a cold start
  setInterval(refresh, REFRESH_INTERVAL_MS).unref();
}

module.exports = { startAllowedOriginsRefresh, isOriginAllowed };
