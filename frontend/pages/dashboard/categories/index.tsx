import { FormEvent, useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import Alert from '@/components/Alert';
import { PencilIcon, TrashIcon } from '@/components/icons';
import { apiFetch, ApiError } from '@/utils/api';

interface Category {
  id: string;
  name: string;
  description?: string;
  productCount: number;
}

function CategoriesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState('');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  function loadCategories() {
    apiFetch<{ categories: Category[] }>('/categories')
      .then((res) => setCategories(res.categories))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load categories.'));
  }

  useEffect(loadCategories, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    setError('');
    try {
      const res = await apiFetch<{ category: Category }>('/categories', {
        method: 'POST',
        body: { name: name.trim(), description },
      });
      setCategories((prev) => [...(prev || []), res.category].sort((a, b) => a.name.localeCompare(b.name)));
      setName('');
      setDescription('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create category.');
    } finally {
      setAdding(false);
    }
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditDescription(category.description || '');
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await apiFetch<{ category: Category }>(`/categories/${id}`, {
        method: 'PUT',
        body: { name: editName.trim(), description: editDescription },
      });
      setCategories((prev) => prev?.map((c) => (c.id === id ? res.category : c)) || null);
      setEditingId('');
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
      setCategories((prev) => prev?.filter((c) => c.id !== id) || null);
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
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-700">Description (optional)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Description</th>
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
                    <td className="px-4 py-2">
                      <input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
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
                    <td className="px-4 py-3 text-gray-600">{category.description || '—'}</td>
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
        )}
      </div>
    </DashboardLayout>
  );
}

export default withAuth(CategoriesPage);
