import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

/**
 * Keeps a catalog listing's search/category-filter/page state synced
 * with the URL's query string, so it survives navigating away and back.
 * Without this, pagination was pure component state — clicking into a
 * product from page 5 and then clicking "back" always landed on page 1,
 * since the listing remounts fresh with no memory of where the visitor
 * was. Reflecting it in the URL means the browser's own back navigation
 * (see ModernGridDetail's "Back to {catalog}" link) restores the exact
 * page/filter for free — no extra state to pass around.
 *
 * router.replace (not push) and { shallow: true } — pagination clicks
 * shouldn't pile up their own back-history entries (one "back" press
 * should return to the listing, not have to click through every page
 * transition first), and shallow avoids re-running getServerSideProps
 * for what's purely a client-side filter/page change.
 */
export function useCatalogListState() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [hydrated, setHydrated] = useState(false);

  // router.query is {} on the very first client render for a dynamically-
  // routed page (a known Next.js Pages Router quirk) — router.isReady
  // flips true once it's actually been populated from the real URL.
  useEffect(() => {
    if (!router.isReady || hydrated) return;
    const q = router.query;
    if (typeof q.search === 'string') setSearch(q.search);
    if (typeof q.category === 'string') setCategoryFilter(q.category);
    if (typeof q.page === 'string') {
      const parsed = parseInt(q.page, 10);
      if (Number.isFinite(parsed) && parsed > 0) setPage(parsed);
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  useEffect(() => {
    if (!hydrated) return;
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categoryFilter) params.set('category', categoryFilter);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    const basePath = router.asPath.split('?')[0];
    const url = qs ? `${basePath}?${qs}` : basePath;
    // Skip a no-op replace to the URL we're already on — the hydration
    // effect above finishing (page=1/search=''/category='' on a plain
    // /public/{slug} visit) would otherwise fire one here for free on
    // every single load, right as a real click might also be queuing its
    // own replace, and the two stepping on each other is what caused
    // pagination clicks to silently do nothing in testing.
    if (url === router.asPath) return;
    router.replace(url, undefined, { shallow: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryFilter, page, hydrated]);

  // Changing the search or category filter always resets to page 1 —
  // same behavior both templates already had, just centralized here.
  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }
  function updateCategoryFilter(value: string) {
    setCategoryFilter(value);
    setPage(1);
  }

  return { search, categoryFilter, page, setPage, updateSearch, updateCategoryFilter };
}
