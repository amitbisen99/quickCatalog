import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import Alert from '@/components/Alert';
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
  price: number;
  taxPercent?: number;
  unit?: string;
  minimumOrderQuantity?: number;
  images: string[];
  categoryId?: string;
  catalogIds: string[];
}

function ProductsLibrary() {
  const { user } = useAuth();
  const symbol = currencySymbol(user?.currency);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ categories: Category[] }>('/categories').then((res) => setCategories(res.categories));
  }, []);

  const loadProducts = useCallback(() => {
    const params = new URLSearchParams();
    if (categoryFilter) params.set('categoryId', categoryFilter);
    if (search) params.set('search', search);

    apiFetch<{ products: Product[] }>(`/products?${params}`)
      .then((res) => setProducts(res.products))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load products.'));
  }, [categoryFilter, search]);

  useEffect(loadProducts, [loadProducts]);

  async function handleDelete(id: string, name: string, catalogCount: number) {
    const extra = catalogCount > 0 ? ` It's currently used in ${catalogCount} catalog${catalogCount > 1 ? 's' : ''} — this removes it from all of them.` : '';
    if (!window.confirm(`Permanently delete "${name}"?${extra}`)) return;
    try {
      await apiFetch(`/products/${id}`, { method: 'DELETE' });
      setProducts((prev) => prev?.filter((p) => p.id !== id) || null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete product.');
    }
  }

  const categoryName = (id?: string) => categories.find((c) => c.id === id)?.name || '—';

  return (
    <DashboardLayout title="Products">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-500">Your product library, shared across every catalog.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/products/bulk-import"
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Bulk Import
          </Link>
          <Link
            href="/dashboard/products/create"
            className="rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800"
          >
            Add Product
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by product name…"
          className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
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

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {products === null ? (
          <p className="p-6 text-sm text-gray-500">Loading…</p>
        ) : products.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-gray-900">No products yet</p>
            <p className="mt-1 text-sm text-gray-500">Add a product to start building your library.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Product Name</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Catalogs</th>
                  <th className="px-4 py-3 font-medium">Images</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/products/${product.id}/edit`}
                        className="font-medium text-gray-900 hover:text-primary-700"
                      >
                        {product.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{categoryName(product.categoryId)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {symbol}{product.price}
                      {product.taxPercent ? <span className="text-xs text-gray-400"> (+{product.taxPercent}%)</span> : null}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{product.unit || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{product.catalogIds.length}</td>
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
                          href={`/dashboard/products/${product.id}/edit`}
                          className="text-gray-400 hover:text-primary-700"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(product.id, product.name, product.catalogIds.length)}
                          className="text-gray-400 hover:text-red-600"
                          title="Delete permanently"
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
    </DashboardLayout>
  );
}

export default withAuth(ProductsLibrary);
