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

// Resolved-domain lookups are cached in-memory (this runs in the same
// long-lived Node process as the rest of the app, not a per-request edge
// isolate, since we're self-hosted rather than on Vercel's edge network —
// so a plain module-level Map persists correctly across requests). Domain
// activation is a manual, multi-hour process on the backend, so a short
// TTL here costs nothing in staleness while saving a backend round-trip
// on every single request from a white-label domain.
const CACHE_TTL_MS = 60 * 1000;
const resolvedDomainCache = new Map<string, { slug: string | null; expiresAt: number }>();

async function resolveSlugForHost(hostname: string): Promise<string | null> {
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
    // 404 rather than taking the whole domain down over a transient error).
  }

  resolvedDomainCache.set(hostname, { slug, expiresAt: Date.now() + CACHE_TTL_MS });
  return slug;
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')?.split(':')[0] || '';

  // Own domain, localhost (dev), or no host at all — nothing to do.
  if (!hostname || hostname === OWN_HOSTNAME || hostname === 'localhost' || hostname === '127.0.0.1') {
    return NextResponse.next();
  }

  const slug = await resolveSlugForHost(hostname);
  if (!slug) {
    // Unrecognized domain — let it fall through to whatever Next would
    // normally serve for this path (the marketing homepage at `/`, a real
    // 404 for anything else) rather than pretending to be a valid catalog.
    return NextResponse.next();
  }

  // Preserve whatever path/query the visitor requested past the root —
  // `/products/abc123` on the vendor's domain maps the same way
  // `/public/{slug}/products/abc123` already does on the main domain. The
  // root path itself needs special-casing so it becomes `/public/{slug}`
  // rather than `/public/{slug}/` (a trailing slash Next's page router
  // doesn't need to be asked to normalize).
  const suffix = request.nextUrl.pathname === '/' ? '' : request.nextUrl.pathname;
  const url = request.nextUrl.clone();
  url.pathname = `/public/${slug}${suffix}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skips Next's own internals and static assets — those are served
  // identically regardless of which domain requested them, so there's
  // nothing to resolve and no reason to pay a backend round-trip for them.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|workbox-).*)'],
};
