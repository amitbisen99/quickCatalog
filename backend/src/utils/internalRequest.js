const crypto = require('crypto');

const SECRET = process.env.INTERNAL_API_SECRET || '';

/**
 * True only for requests carrying our own Next.js server's shared secret
 * (frontend/utils/api.ts's internalFetch) — used to exempt its
 * server-to-server data fetches (public catalog pages' getServerSideProps,
 * middleware's domain lookup, the sitemap) from the per-visitor rate limit.
 * Those all originate from that one process regardless of how many
 * distinct people are actually viewing catalogs, so left in the normal
 * per-IP bucket they get worse, not better, as more vendors and their
 * visitors join — this is the fix for that.
 *
 * Never trusts an empty secret: if INTERNAL_API_SECRET isn't set (e.g. a
 * fresh clone with no .env), this always returns false rather than letting
 * "" === "" on both sides pass every request.
 */
function isInternalRequest(req) {
  if (!SECRET) return false;
  const provided = req.headers['x-internal-secret'];
  if (typeof provided !== 'string' || provided.length !== SECRET.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(SECRET));
}

module.exports = { isInternalRequest };
