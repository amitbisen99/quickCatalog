import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import Alert from '@/components/Alert';
import ProgressBar from '@/components/ProgressBar';
import UpgradePlanModal from '@/components/dashboard/UpgradePlanModal';
import { apiFetch, ApiError } from '@/utils/api';
import { currencySymbol } from '@/utils/currency';
import { isPlanLimitError } from '@/utils/planLimit';
import { useAuth } from '@/context/AuthContext';

interface Product {
  id: string;
  name: string;
  price: number;
  taxPercent?: number;
  unit?: string;
  images: string[];
}

function AddExistingProduct() {
  const router = useRouter();
  const { user } = useAuth();
  const symbol = currencySymbol(user?.currency);
  const catalogId = typeof router.query.catalogId === 'string' ? router.query.catalogId : '';

  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkProgress, setLinkProgress] = useState({ done: 0, total: 0 });
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  useEffect(() => {
    if (!catalogId) return;
    // listVendorProducts now defaults to a 20-per-page slice for the main
    // Products library's pagination — this picker isn't paginated, so it
    // asks for its previous effective limit explicitly instead of
    // silently shrinking to 20 results.
    const params = new URLSearchParams({ excludeCatalogId: catalogId, limit: '50' });
    if (search) params.set('search', search);
    apiFetch<{ products: Product[] }>(`/products?${params}`)
      .then((res) => setProducts(res.products))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load products.'));
  }, [catalogId, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAddSelected() {
    const ids = Array.from(selected);
    setLinking(true);
    setError('');
    setLinkProgress({ done: 0, total: ids.length });

    // Tracked individually (not Promise.all's fail-fast) so the progress
    // bar reflects real completions, and one failure among many doesn't
    // hide that the rest actually succeeded server-side.
    let done = 0;
    let failed = 0;
    let hitPlanLimit = false;
    await Promise.all(
      ids.map(async (productId) => {
        try {
          await apiFetch(`/catalogs/${catalogId}/products/${productId}/link`, { method: 'POST' });
        } catch (err) {
          failed += 1;
          if (isPlanLimitError(err)) hitPlanLimit = true;
        } finally {
          done += 1;
          setLinkProgress({ done, total: ids.length });
        }
      })
    );

    if (hitPlanLimit) {
      // Once the free-tier cap is hit, every remaining link attempt fails
      // the same way — the upgrade prompt is more useful here than the
      // generic partial-failure message below.
      setUpgradeModalOpen(true);
      setLinking(false);
    } else if (failed > 0) {
      setError(
        failed === ids.length
          ? 'Could not add the selected products. Please try again.'
          : `Added ${ids.length - failed} of ${ids.length} products — ${failed} could not be added. Please try again for the rest.`
      );
      setLinking(false);
    } else {
      router.push(`/dashboard/catalogs/${catalogId}/products`);
    }
  }

  return (
    <DashboardLayout title="Add Existing Product">
      <Link
        href={`/dashboard/catalogs/${catalogId}/products`}
        className="text-sm font-medium text-gray-500 hover:text-primary-700"
      >
        ← Back to products
      </Link>
      <h1 className="mt-1 text-3xl font-bold text-gray-900">Add Existing Product</h1>
      <p className="mt-1 text-sm text-gray-500">Pick products from your library to reuse in this catalog.</p>

      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div className="mt-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your products…"
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
        />
      </div>

      <div className="mt-6">
        {products === null ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <p className="text-sm font-medium text-gray-900">Nothing to add</p>
            <p className="mt-1 text-sm text-gray-500">
              Everything you have is already in this catalog, or you haven&apos;t created any products yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => {
              const isSelected = selected.has(p.id);
              return (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 shadow-sm transition-colors ${
                    isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white hover:border-primary-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(p.id)}
                    className="h-4 w-4 shrink-0 rounded border-gray-300 text-primary-700 focus:ring-primary-600"
                  />
                  {p.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0]} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-100" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500">
                      {symbol}{p.price} / {p.unit || 'pcs'}
                      {p.taxPercent ? ` (+${p.taxPercent}% tax)` : ''}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {products && products.length > 0 && (
        <div className="sticky bottom-4 mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={handleAddSelected}
              disabled={selected.size === 0 || linking}
              className="rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {linking ? `Adding ${linkProgress.done} of ${linkProgress.total}…` : `Add Selected (${selected.size})`}
            </button>
            {linking ? (
              <span className="text-sm font-medium text-gray-500">Please don&apos;t close this page.</span>
            ) : (
              <Link
                href={`/dashboard/catalogs/${catalogId}/products`}
                className="text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Cancel
              </Link>
            )}
          </div>
          {linking && (
            <div className="mt-3">
              <ProgressBar percent={linkProgress.total ? (linkProgress.done / linkProgress.total) * 100 : 0} />
            </div>
          )}
        </div>
      )}

      <UpgradePlanModal isOpen={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} reason="product" />
    </DashboardLayout>
  );
}

export default withAuth(AddExistingProduct);
