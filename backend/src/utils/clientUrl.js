// Normalizes CLIENT_URL once, here — stripped of any trailing slash.
// Discovered via the frontend's own NEXT_PUBLIC_APP_URL being set with
// one in production (surfaced as "instantcatalog.app//about" in
// generated URLs); this is the same risk for every place CLIENT_URL gets
// concatenated with a leading-slash path (password reset links, QR
// codes, transactional email links) or compared against a real Origin
// header (which never has a trailing slash, so an unstripped value here
// would silently never match).
const CLIENT_URL = (process.env.CLIENT_URL || '').replace(/\/+$/, '') || undefined;

module.exports = { CLIENT_URL };
