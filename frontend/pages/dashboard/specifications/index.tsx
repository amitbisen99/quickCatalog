import { FormEvent, useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import Alert from '@/components/Alert';
import { PencilIcon, TrashIcon } from '@/components/icons';
import { apiFetch, ApiError } from '@/utils/api';

interface Specification {
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

function SpecificationsPage() {
  const [specifications, setSpecifications] = useState<Specification[] | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState('');
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSpecifications = useCallback(() => {
    apiFetch<{ specifications: Specification[]; pagination: Pagination }>(`/specifications?page=${page}&limit=${PAGE_SIZE}`)
      .then((res) => {
        setSpecifications(res.specifications);
        setPagination(res.pagination);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load specifications.'));
  }, [page]);

  useEffect(loadSpecifications, [loadSpecifications]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    setError('');
    try {
      await apiFetch<{ specification: Specification }>('/specifications', {
        method: 'POST',
        body: { name: name.trim() },
      });
      setName('');
      // A new specification can sort onto any page (list is name-ordered)
      // — jump to page 1 rather than guess where it landed. If already
      // on page 1, setPage(1) is a no-op, so reload directly then.
      if (page === 1) loadSpecifications();
      else setPage(1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create specification.');
    } finally {
      setAdding(false);
    }
  }

  function startEdit(spec: Specification) {
    setEditingId(spec.id);
    setEditName(spec.name);
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return;
    setSaving(true);
    setError('');
    try {
      await apiFetch<{ specification: Specification }>(`/specifications/${id}`, {
        method: 'PUT',
        body: { name: editName.trim() },
      });
      setEditingId('');
      loadSpecifications();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update specification.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, specName: string) {
    if (!window.confirm(`Delete "${specName}"?`)) return;
    try {
      await apiFetch(`/specifications/${id}`, { method: 'DELETE' });
      // Deleting the last item on a page past the first would otherwise
      // land on an empty page — step back a page instead of reloading in
      // place when that happens.
      if (specifications?.length === 1 && page > 1) setPage((p) => p - 1);
      else loadSpecifications();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete specification.');
    }
  }

  return (
    <DashboardLayout title="Specifications">
      <h1 className="text-3xl font-bold text-gray-900">Specifications</h1>
      <p className="mt-1 text-sm text-gray-500">
        Manage the specification fields (e.g. Size, Color, Material) available when adding a product.
      </p>

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
          <label className="block text-xs font-medium text-gray-700">Specification Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Color"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
          />
        </div>
        <button
          type="submit"
          disabled={adding || !name.trim()}
          className="rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {adding ? 'Adding…' : 'Add Specification'}
        </button>
      </form>

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {specifications === null ? (
          <p className="p-6 text-sm text-gray-500">Loading…</p>
        ) : specifications.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-gray-900">No specifications yet</p>
            <p className="mt-1 text-sm text-gray-500">Add your first specification field above.</p>
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
                {specifications.map((spec) =>
                  editingId === spec.id ? (
                    <tr key={spec.id}>
                      <td className="px-4 py-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-600">{spec.productCount}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleSaveEdit(spec.id)}
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
                    <tr key={spec.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{spec.name}</td>
                      <td className="px-4 py-3 text-gray-600">{spec.productCount}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-4">
                          <button onClick={() => startEdit(spec)} className="text-gray-400 hover:text-primary-700" title="Rename">
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(spec.id, spec.name)}
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
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} specification{pagination.total === 1 ? '' : 's'}
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

export default withAuth(SpecificationsPage);
