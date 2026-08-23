// Subdomains a vendor must never be able to claim — either because they're
// already real infrastructure (would collide with an actual deployed app or
// a future one), or because they'd be confusing/impersonation-prone as a
// vendor's storefront address.
const RESERVED_SUBDOMAINS = new Set([
  'www',
  'api',
  'app',
  'admin',
  'mail',
  'email',
  'ftp',
  'blog',
  'help',
  'support',
  'status',
  'cdn',
  'static',
  'assets',
  'docs',
  'dev',
  'staging',
  'test',
  'demo',
  'shop', // generic enough to be worth reserving for our own future use
]);

module.exports = { RESERVED_SUBDOMAINS };
