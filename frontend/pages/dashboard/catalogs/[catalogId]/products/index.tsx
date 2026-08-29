import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import Alert from '@/components/Alert';
import AddProductModal from '@/components/dashboard/AddProductModal';
import BulkPriceModal from '@/components/dashboard/BulkPriceModal';
import BulkCategoryModal from '@/components/dashboard/BulkCategoryModal';
import { EyeIcon, PencilIcon, TrashIcon } from '@/components/icons';
import { apiFetch, ApiError } from '@/utils/api';
import { currencySymbol } from '@/utils/currency';
import { useAuth } from '@/context/AuthContext';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  price: number;
  taxPercent?: number;
  unit?: string;
  minimumOrderQuantity?: number;
  images: string[];
  categoryId?: string;
  // Used only to warn before a bulk edit — a product shared across
  // catalogs gets its price/category changed everywhere, not just here.
  catalogIds: string[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function ProductsList() {
  const router = useRouter();
  const { user } = useAuth();
  const symbol = currencySymbol(user?.currency);
  const catalogId = typeof router.query.catalogId === 'string' ? router.query.catalogId : '';

  const [products, setProducts] = useState<Product[] | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Keyed by product id rather than a plain id Set so the bulk-action
  // modals have the price/catalogIds they need for preview without a
  // second fetch — populated from whatever page(s) of `products` the
  // vendor has actually loaded (current page, or every matching product
  // once "Select all" is used).
  const [selected, setSelected] = useState<Map<string, Product>>(new Map());
  const [selectingAll, setSelectingAll] = useState(false);
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  // Inline price editing — for the "10 products, 10 different new prices"
  // case the rule-based Adjust Price modal can't express. Raw strings (not
  // numbers) keyed by product id, held only for rows the vendor has
  // actually typed into; kept separate from `selected`/the bulk-rule
  // modals so the two editing paths can't silently clobber each other.
  const [editedPrices, setEditedPrices] = useState<Record<string, string>>({});
  const [savingEdits, setSavingEdits] = useState(false);

  useEffect(() => {
    if (!catalogId) return;
    apiFetch<{ categories: Category[] }>('/categories').then((res) => setCategories(res.categories));
  }, [catalogId]);

  const loadProducts = useCallback(() => {
    if (!catalogId) return;
    const params = new URLSearchParams({ page: String(page) });
    if (categoryFilter) params.set('categoryId', categoryFilter);
    if (search) params.set('search', search);

    apiFetch<{ products: Product[]; pagination: Pagination }>(`/catalogs/${catalogId}/products?${params}`)
      .then((res) => {
        setProducts(res.products);
        setPagination(res.pagination);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load products.'));
  }, [catalogId, categoryFilter, search, page]);

  useEffect(loadProducts, [loadProducts]);

  // A selection spanning a search/category filter stops making sense once
  // that filter changes (the vendor was looking at a different set of
  // products) — but not on page change alone, since "select all matching"
  // is specifically meant to survive paging through the result.
  useEffect(() => {
    setSelected(new Map());
    setEditedPrices({});
  }, [catalogId, categoryFilter, search]);

// Unchecking a row also drops any pending inline price edit for it — the
  // field is about to go non-editable, so a hidden unsaved edit sitting
  // behind it would be confusing (and unreachable to save or discard).
  function dropEditedPrice(productId: string) {
    setEditedPrices((prev) => {
      if (!(productId in prev)) return prev;
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }

  function toggleOne(product: Product) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(product.id)) {
        next.delete(product.id);
        dropEditedPrice(product.id);
      } else {
        next.set(product.id, product);
      }
      return next;
    });
  }

  const allOnPageSelected = !!products && products.length > 0 && products.every((p) => selected.has(p.id));

  function toggleAllOnPage() {
    setSelected((prev) => {
      const next = new Map(prev);
      if (allOnPageSelected) {
        products?.forEach((p) => {
          next.delete(p.id);
          dropEditedPrice(p.id);
        });
      } else {
        products?.forEach((p) => next.set(p.id, p));
      }
      return next;
    });
  }

  // Gmail-style "select all N matching, not just this page" — fetches
  // every product matching the current filters in one request (capped at
  // 2000, matching the bulk endpoints' own cap) rather than making the
  // vendor page through 20 at a time to select all 120.
  async function selectAllMatching() {
    if (!pagination) return;
    setSelectingAll(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: String(Math.min(pagination.total, 2000)) });
      if (categoryFilter) params.set('categoryId', categoryFilter);
      if (search) params.set('search', search);
      const res = await apiFetch<{ products: Product[] }>(`/catalogs/${catalogId}/products?${params}`);
      setSelected(new Map(res.products.map((p) => [p.id, p])));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not select all matching products.');
    } finally {
      setSelectingAll(false);
    }
  }

  function handleBulkApplied() {
    setSelected(new Map());
    loadProducts();
  }

  function isPriceDirty(product: Product): boolean {
    const edited = editedPrices[product.id];
    if (edited === undefined) return false;
    const n = Number(edited);
    return edited.trim() !== '' && !Number.isNaN(n) && n !== product.price;
  }

  function isPriceInvalid(product: Product): boolean {
    const edited = editedPrices[product.id];
    if (edited === undefined) return false;
    const n = Number(edited);
    return edited.trim() !== '' && (Number.isNaN(n) || n < 0);
  }

  const dirtyProducts = (products || []).filter(isPriceDirty);
  const hasInvalidEdit = (products || []).some(isPriceInvalid);

  async function handleSaveEdits() {
    if (dirtyProducts.length === 0 || hasInvalidEdit) return;
    setSavingEdits(true);
    setError('');
    try {
      await apiFetch('/products/bulk-price', {
        method: 'PUT',
        body: { updates: dirtyProducts.map((p) => ({ productId: p.id, price: Number(editedPrices[p.id]) })) },
      });
      setEditedPrices({});
      loadProducts();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save price changes. Please try again.');
    } finally {
      setSavingEdits(false);
    }
  }

  function handleDiscardEdits() {
    setEditedPrices({});
  }

  // "Remove" only unlinks the product from this catalog — the product
  // itself (and its presence in other catalogs) is untouched. Permanent
  // deletion happens from the product's own edit page.
  async function handleRemove(id: string, name: string) {
    if (!window.confirm(`Remove "${name}" from this catalog? It will stay in any other catalogs it's part of.`)) return;
    try {
      await apiFetch(`/catalogs/${catalogId}/products/${id}`, { method: 'DELETE' });
      setProducts((prev) => prev?.filter((p) => p.id !== id) || null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove product.');
    }
  }

  const categoryName = (id?: string) => categories.find((c) => c.id === id)?.name || '—';

  return (
    <DashboardLayout title="Products">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/dashboard/catalogs/${catalogId}`} className="text-sm font-medium text-gray-500 hover:text-primary-700">
            ← Back to catalog
          </Link>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">Products</h1>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800"
        >
          Add Product
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Search by product name or SKU…"
          className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
        />
        <select
          value={categoryFilter}
          onChange={(e) => {
            setPage(1);
            setCategoryFilter(e.target.value);
          }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {selected.size > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3">
          <span className="text-sm font-medium text-primary-900">
            {selected.size} selected
          </span>
          {pagination && selected.size < pagination.total && allOnPageSelected && (
            <button
              type="button"
              onClick={selectAllMatching}
              disabled={selectingAll}
              className="text-sm font-medium text-primary-700 underline hover:text-primary-800 disabled:opacity-50"
            >
              {selectingAll ? 'Selecting…' : `Select all ${pagination.total} matching`}
            </button>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPriceModalOpen(true)}
              disabled={dirtyProducts.length > 0}
              title={dirtyProducts.length > 0 ? 'Save or discard your price edits below first' : undefined}
              className="rounded-lg border border-primary-300 bg-white px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Adjust Price
            </button>
            <button
              type="button"
              onClick={() => setCategoryModalOpen(true)}
              disabled={dirtyProducts.length > 0}
              title={dirtyProducts.length > 0 ? 'Save or discard your price edits below first' : undefined}
              className="rounded-lg border border-primary-300 bg-white px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Change Category
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Map())}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {products === null ? (
          <p className="p-6 text-sm text-gray-500">Loading…</p>
        ) : products.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-gray-900">No products yet</p>
            <p className="mt-1 text-sm text-gray-500">Add your first product to this catalog.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleAllOnPage}
                      aria-label="Select all products on this page"
                      className="h-4 w-4 rounded border-gray-300 text-primary-700 focus:ring-primary-600"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Product Name</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Min Order Qty</th>
                  <th className="px-4 py-3 font-medium">Images</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr key={product.id} className={selected.has(product.id) ? 'bg-primary-50/40' : undefined}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(product.id)}
                        onChange={() => toggleOne(product)}
                        aria-label={`Select ${product.name}`}
                        className="h-4 w-4 rounded border-gray-300 text-primary-700 focus:ring-primary-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/catalogs/${catalogId}/products/${product.id}/edit`}
                        className="font-medium text-gray-900 hover:text-primary-700"
                      >
                        {product.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{product.sku || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{categoryName(product.categoryId)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <span className="shrink-0">{symbol}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editedPrices[product.id] ?? product.price}
                          onChange={(e) => setEditedPrices((prev) => ({ ...prev, [product.id]: e.target.value }))}
                          disabled={!selected.has(product.id)}
                          title={!selected.has(product.id) ? 'Select this product to edit its price' : undefined}
                          aria-label={`Price for ${product.name}`}
                          className={`w-20 min-w-0 rounded-md border px-1.5 py-1 text-sm focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400 ${
                            isPriceInvalid(product)
                              ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                              : isPriceDirty(product)
                                ? 'border-primary-400 bg-primary-50 focus:border-primary-600 focus:ring-primary-600'
                                : 'border-gray-300 focus:border-primary-600 focus:ring-primary-600'
                          }`}
                        />
                      </div>
                      {product.taxPercent ? <span className="text-xs text-gray-400">(+{product.taxPercent}%)</span> : null}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{product.unit || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{product.minimumOrderQuantity || 1}</td>
                    <td className="px-4 py-3 text-gray-600">{product.images.length}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-4">
                        <Link
                          href={`/dashboard/products/${product.id}/view`}
                          className="text-gray-400 hover:text-primary-700"
                          title="View"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </Link>
                        <Link
                          href={`/dashboard/catalogs/${catalogId}/products/${product.id}/edit`}
                          className="text-gray-400 hover:text-primary-700"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </Link>
                        <button
                          onClick={() => handleRemove(product.id, product.name)}
                          className="text-gray-400 hover:text-red-600"
                          title="Remove from catalog"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dirtyProducts.length > 0 && (
        <div className="sticky bottom-20 z-10 mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-primary-200 bg-white px-4 py-3 shadow-lg lg:bottom-4">
          <span className="text-sm font-medium text-gray-900">
            {dirtyProducts.length} unsaved price change{dirtyProducts.length === 1 ? '' : 's'}
          </span>
          {hasInvalidEdit && <span className="text-sm text-red-600">Fix the highlighted price before saving.</span>}
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveEdits}
              disabled={savingEdits || hasInvalidEdit}
              className="rounded-lg bg-primary-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingEdits ? 'Saving…' : 'Save all'}
            </button>
            <button
              type="button"
              onClick={handleDiscardEdits}
              disabled={savingEdits}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
            className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {catalogId && <AddProductModal catalogId={catalogId} isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} />}

      <BulkPriceModal
        isOpen={priceModalOpen}
        onClose={() => setPriceModalOpen(false)}
        products={Array.from(selected.values())}
        currency={user?.currency}
        onApplied={handleBulkApplied}
      />
      <BulkCategoryModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        products={Array.from(selected.values())}
        categories={categories}
        onApplied={handleBulkApplied}
      />
    </DashboardLayout>
  );
}

export default withAuth(ProductsList);
