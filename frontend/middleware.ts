import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/utils/api';

// The app's own hostname — any request arriving with this Host header is
// normal traffic and needs zero white-label handling. Anything else is a
// candidate vendor subdomain/custom domain.
const OWN_HOSTNAME = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010').hostname;
  } catch {
    return 'localhost';
  }
})();

// White-label domains are vendor-scoped, not per-catalog — every catalog
// a vendor owns is already reachable at `{their-domain}/public/{slug}`
// with zero rewriting needed, since the public catalog route resolves
// purely from the slug in the URL regardless of hostname. So this
// middleware only has two jobs on a recognized vendor domain:
//  1. Root path (no /public/... in the URL) → redirect to whichever
//     catalog the vendor picked as their "primary" one.
//  2. Internal routes (/login, /dashboard, /admin, /signup, ...) →
//     redirect to the primary catalog too, rather than exposing our
//     dashboard/admin/auth screens under their branding.
// Both need to know the vendor's primary catalog slug, so both go through
// the same resolvePrimarySlugForHost lookup.

// Resolved-domain lookups are cached in-memory (this runs in the same
// long-lived Node process as the rest of the app, not a per-request edge
// isolate, since we're self-hosted rather than on Vercel's edge network —
// so a plain module-level Map persists correctly across requests). Domain
// activation is a manual, multi-hour process on the backend, so a short
// TTL here costs nothing in staleness while saving a backend round-trip
// on every root-path hit from a white-label domain.
const CACHE_TTL_MS = 60 * 1000;
const resolvedDomainCache = new Map<string, { slug: string | null; expiresAt: number }>();

async function resolvePrimarySlugForHost(hostname: string): Promise<string | null> {
  const cached = resolvedDomainCache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.slug;
  }

  let slug: string | null = null;
  try {
    const res = await fetch(`${API_URL}/public/resolve-domain?host=${encodeURIComponent(hostname)}`);
    if (res.ok) {
      const data = await res.json();
      slug = data.slug || null;
    }
  } catch {
    // Backend unreachable — fall through to null (renders as a normal
    // page rather than taking the whole domain down over a transient error).
  }

  resolvedDomainCache.set(hostname, { slug, expiresAt: Date.now() + CACHE_TTL_MS });
  return slug;
}

export async function middleware(request: NextRequest) {
  // Whatever happens inside here, normal traffic must never go down over
  // it — a bug or an unexpected runtime quirk in this white-label routing
  // logic should degrade to "acts like this middleware doesn't exist",
  // never to a 500 on every single page.
  try {
    const hostname = request.headers.get('host')?.split(':')[0] || '';
    const { pathname } = request.nextUrl;

    // Own domain, localhost (dev), or no host at all — nothing to do.
    if (!hostname || hostname === OWN_HOSTNAME || hostname === 'localhost' || hostname === '127.0.0.1') {
      return NextResponse.next();
    }

    // Public catalog pages (and their static assets, already excluded by
    // the matcher below) already work correctly on any hostname — the
    // [slug] route resolves purely from the URL path. Nothing to do here.
    if (pathname.startsWith('/public/')) {
      return NextResponse.next();
    }

    const slug = await resolvePrimarySlugForHost(hostname);
    if (!slug) {
      // Unrecognized domain, or a recognized one with no catalogs yet —
      // let it fall through to whatever Next would normally serve.
      return NextResponse.next();
    }

    // Root path (the vendor's domain with no /public/... in the URL) and
    // any other internal route (/login, /dashboard, /admin, /signup, ...
    // which shouldn't be reachable under a vendor's own branding) both
    // land on the same place: their primary catalog. Redirect straight
    // there in one hop rather than bouncing through `/` first.
    const url = request.nextUrl.clone();
    url.pathname = `/public/${slug}`;
    return NextResponse.redirect(url);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('middleware error, falling through to normal routing:', err);
    return NextResponse.next();
  }
}

export const config = {
  // Skips Next's own internals and static assets — those are served
  // identically regardless of which domain requested them, so there's
  // nothing to resolve and no reason to pay a backend round-trip for them.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|workbox-).*)'],
};
