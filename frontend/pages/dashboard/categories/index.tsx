import { FormEvent, useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import Alert from '@/components/Alert';
import { PencilIcon, TrashIcon } from '@/components/icons';
import { apiFetch, ApiError } from '@/utils/api';

interface Category {
  id: string;
  name: string;
  productCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const PAGE_SIZE = 10;

function CategoriesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState('');
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(() => {
    apiFetch<{ categories: Category[]; pagination: Pagination }>(`/categories?page=${page}&limit=${PAGE_SIZE}`)
      .then((res) => {
        setCategories(res.categories);
        setPagination(res.pagination);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load categories.'));
  }, [page]);

  useEffect(loadCategories, [loadCategories]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    setError('');
    try {
      await apiFetch<{ category: Category }>('/categories', {
        method: 'POST',
        body: { name: name.trim() },
      });
      setName('');
      // A new category can sort onto any page (list is name-ordered) —
      // jump to page 1 rather than guess where it landed. If already on
      // page 1, setPage(1) is a no-op, so reload directly in that case.
      if (page === 1) loadCategories();
      else setPage(1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create category.');
    } finally {
      setAdding(false);
    }
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditName(category.name);
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return;
    setSaving(true);
    setError('');
    try {
      await apiFetch<{ category: Category }>(`/categories/${id}`, {
        method: 'PUT',
        body: { name: editName.trim() },
      });
      setEditingId('');
      loadCategories();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update category.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, categoryName: string) {
    if (!window.confirm(`Delete "${categoryName}"?`)) return;
    try {
      await apiFetch(`/categories/${id}`, { method: 'DELETE' });
      // Deleting the last item on a page past the first would otherwise
      // land on an empty page — step back a page instead of reloading in
      // place when that happens.
      if (categories?.length === 1 && page > 1) setPage((p) => p - 1);
      else loadCategories();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete category.');
    }
  }

  return (
    <DashboardLayout title="Categories">
      <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
      <p className="mt-1 text-sm text-gray-500">Organize your products into categories.</p>

      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <form
        onSubmit={handleAdd}
        className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
      >
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-gray-700">Category Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
          />
        </div>
        <button
          type="submit"
          disabled={adding || !name.trim()}
          className="rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {adding ? 'Adding…' : 'Add Category'}
        </button>
      </form>

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {categories === null ? (
          <p className="p-6 text-sm text-gray-500">Loading…</p>
        ) : categories.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-gray-900">No categories yet</p>
            <p className="mt-1 text-sm text-gray-500">Add your first category above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Products</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((category) =>
                  editingId === category.id ? (
                    <tr key={category.id}>
                      <td className="px-4 py-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-600">{category.productCount}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleSaveEdit(category.id)}
                            disabled={saving}
                            className="text-xs font-semibold text-primary-700 hover:text-primary-800"
                          >
                            Save
                          </button>
                          <button onClick={() => setEditingId('')} className="text-xs font-medium text-gray-500 hover:text-gray-700">
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={category.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{category.name}</td>
                      <td className="px-4 py-3 text-gray-600">{category.productCount}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-4">
                          <button onClick={() => startEdit(category)} className="text-gray-400 hover:text-primary-700" title="Rename">
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(category.id, category.name)}
                            className="text-gray-400 hover:text-red-600"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} categor{pagination.total === 1 ? 'y' : 'ies'}
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
    </DashboardLayout>
  );
}

export default withAuth(CategoriesPage);
