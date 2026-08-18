import { useEffect } from 'react';
import { apiFetch } from './api';

const VISITOR_KEY = 'qc_visitor_id';

// A stable per-browser id, kept in localStorage — deliberately not a
// cookie (see backend/src/models/Visit.js for why) and deliberately not
// tied to any one catalog, so a visitor who looks at two of a vendor's
// catalogs still counts as one "unique visitor" story if that's ever
// aggregated across catalogs later.
function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `v_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    // Private browsing / storage disabled — just skip tracking rather
    // than generating a fresh id (and inflating "unique visitors") on
    // every single page load.
    return '';
  }
}

/**
 * Fire-and-forget visit tracking for a public catalog page view or a
 * product being opened within it. Never throws and never awaited by
 * callers — analytics must not be able to slow down or break the page
 * for an actual visitor.
 */
export function trackVisit(catalogSlug: string, productId?: string) {
  const visitorId = getVisitorId();
  if (!visitorId) return;
  apiFetch('/analytics/track', { method: 'POST', body: { catalogSlug, visitorId, productId } }).catch(() => {});
}

/**
 * Fires trackVisit once whenever the given catalog/product changes —
 * shared by every place that needs to record a view: the catalog page
 * itself, the standalone product detail page, and Editorial Spotlight's
 * inline product browsing (which never navigates, so a page-load-based
 * effect alone wouldn't see it). `slug` undefined skips tracking, which
 * covers the "data hasn't loaded yet" case at every call site.
 */
export function useTrackVisit(slug: string | undefined, productId?: string) {
  useEffect(() => {
    if (slug) trackVisit(slug, productId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, productId]);
}
