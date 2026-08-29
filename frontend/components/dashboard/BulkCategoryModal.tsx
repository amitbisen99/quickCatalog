import { useState } from 'react';
import Modal from '@/components/Modal';
import Alert from '@/components/Alert';
import { apiFetch, ApiError } from '@/utils/api';

interface Category {
  id: string;
  name: string;
}

export interface BulkCategoryProduct {
  id: string;
  catalogIds: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  products: BulkCategoryProduct[];
  categories: Category[];
  onApplied: () => void;
}

export default function BulkCategoryModal({ isOpen, onClose, products, categories, onApplied }: Props) {
  const [categoryId, setCategoryId] = useState('');
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');

  const sharedCount = products.filter((p) => p.catalogIds.length > 1).length;

  async function handleApply() {
    setApplying(true);
    setError('');
    try {
      await apiFetch('/products/bulk-category', {
        method: 'PUT',
        body: { productIds: products.map((p) => p.id), categoryId: categoryId || undefined },
      });
      onApplied();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update category. Please try again.');
    } finally {
      setApplying(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Change Category — ${products.length} product${products.length === 1 ? '' : 's'}`}
    >
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        {sharedCount > 0 && (
          <Alert variant="info">
            {sharedCount} of these {products.length} product{products.length === 1 ? '' : 's'} {sharedCount === 1 ? 'is' : 'are'} also
            used in other catalogs — this updates their category everywhere, not just here.
          </Alert>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">New category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
          >
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleApply}
            disabled={applying}
            className="rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {applying ? 'Applying…' : `Apply to ${products.length} product${products.length === 1 ? '' : 's'}`}
          </button>
          <button type="button" onClick={onClose} className="text-sm font-medium text-gray-500 hover:text-gray-700">
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
