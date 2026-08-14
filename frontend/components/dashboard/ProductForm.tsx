import { useEffect, useState, DragEvent } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import DOMPurify from 'dompurify';
import 'react-quill/dist/quill.snow.css';
import Alert from '@/components/Alert';
import { TrashIcon, CameraIcon } from '@/components/icons';
import { apiFetch, ApiError } from '@/utils/api';
import { UNITS } from '@/utils/constants';
import { currencySymbol } from '@/utils/currency';
import { useAuth } from '@/context/AuthContext';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

interface Category {
  id: string;
  name: string;
}

interface Specification {
  id: string;
  name: string;
}

interface ImageSlot {
  key: string;
  kind: 'existing' | 'new';
  previewUrl: string;
  file?: File;
}

export interface ProductData {
  id: string;
  name: string;
  description?: string;
  price: number;
  taxPercent?: number;
  unit?: string;
  minimumOrderQuantity?: number;
  categoryId?: string;
  video?: string;
  images: string[];
  catalogIds?: string[];
  specifications?: Record<string, string>;
}

interface Props {
  // Omit catalogId to create/edit in the vendor's global product library,
  // independent of any one catalog.
  catalogId?: string;
  mode: 'create' | 'edit';
  productId?: string;
  initial?: ProductData;
}

let slotKeySeq = 0;

export default function ProductForm({ catalogId, mode, productId, initial }: Props) {
  const router = useRouter();
  const listPath = catalogId ? `/dashboard/catalogs/${catalogId}/products` : '/dashboard/products';
  const { user } = useAuth();
  const symbol = currencySymbol(user?.currency);

  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [price, setPrice] = useState(initial ? String(initial.price) : '');
  const [taxPercent, setTaxPercent] = useState(initial?.taxPercent !== undefined ? String(initial.taxPercent) : '');
  const [unit, setUnit] = useState(initial?.unit || UNITS[0]);
  const [moq, setMoq] = useState(initial ? String(initial.minimumOrderQuantity || 1) : '1');
  const [categoryId, setCategoryId] = useState(initial?.categoryId || '');
  const [video, setVideo] = useState(initial?.video || '');
  const [slots, setSlots] = useState<ImageSlot[]>(
    (initial?.images || []).map((url) => ({ key: String(slotKeySeq++), kind: 'existing', previewUrl: url }))
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  const [specs, setSpecs] = useState<Record<string, string>>(initial?.specifications || {});
  const [specMaster, setSpecMaster] = useState<Specification[]>([]);
  const [newSpecName, setNewSpecName] = useState('');
  const [addingSpec, setAddingSpec] = useState(false);

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    apiFetch<{ categories: Category[] }>('/categories')
      .then((res) => setCategories(res.categories))
      .catch(() => {
        // Non-fatal — the dropdown just stays empty.
      });
    apiFetch<{ specifications: Specification[] }>('/specifications')
      .then((res) => setSpecMaster(res.specifications))
      .catch(() => {
        // Non-fatal — the picker just stays empty.
      });
  }, []);

  function handleImagesPicked(files: FileList | null) {
    if (!files) return;
    const room = 3 - slots.length;
    const picked = Array.from(files).slice(0, room);
    const newSlots: ImageSlot[] = picked.map((file) => ({
      key: String(slotKeySeq++),
      kind: 'new',
      previewUrl: URL.createObjectURL(file),
      file,
    }));
    setSlots((prev) => [...prev, ...newSlots]);
  }

  function removeSlot(key: string) {
    setSlots((prev) => prev.filter((s) => s.key !== key));
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    setSlots((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    setAddingCategory(true);
    try {
      const res = await apiFetch<{ category: Category }>('/categories', {
        method: 'POST',
        body: { name: newCategoryName.trim() },
      });
      setCategories((prev) => [...prev, res.category]);
      setCategoryId(res.category.id);
      setNewCategoryName('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create category.');
    } finally {
      setAddingCategory(false);
    }
  }

  async function handleAddSpecification() {
    if (!newSpecName.trim()) return;
    setAddingSpec(true);
    try {
      const res = await apiFetch<{ specification: Specification }>('/specifications', {
        method: 'POST',
        body: { name: newSpecName.trim() },
      });
      setSpecMaster((prev) => [...prev, res.specification]);
      setSpecs((prev) => ({ ...prev, [res.specification.name]: '' }));
      setNewSpecName('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create specification.');
    } finally {
      setAddingSpec(false);
    }
  }

  function removeSpec(key: string) {
    setSpecs((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function buildFormData(): FormData {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('price', price);
    if (taxPercent) formData.append('taxPercent', taxPercent);
    formData.append('unit', unit);
    formData.append('minimumOrderQuantity', moq);
    if (categoryId) formData.append('categoryId', categoryId);
    if (video) formData.append('video', video);
    formData.append('specifications', JSON.stringify(specs));

    const existingUrls = slots.filter((s) => s.kind === 'existing').map((s) => s.previewUrl);
    formData.append('existingImages', JSON.stringify(existingUrls));
    slots
      .filter((s) => s.kind === 'new' && s.file)
      .forEach((s) => formData.append('images', s.file as File));

    return formData;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Product name is required');
      return;
    }
    if (!price || Number(price) < 0) {
      setError('Enter a valid price');
      return;
    }

    setSaving(true);
    try {
      const formData = buildFormData();
      if (mode === 'create') {
        await apiFetch(catalogId ? `/catalogs/${catalogId}/products` : '/products', { method: 'POST', formData });
      } else {
        // Global edit — affects every catalog this product appears in.
        await apiFetch(`/products/${productId}`, { method: 'PUT', formData });
      }
      router.push(listPath);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePermanently() {
    if (!productId) return;
    const catalogCount = initial?.catalogIds?.length || 0;
    const extra =
      catalogCount > 1 ? ` It's currently used in ${catalogCount} catalogs — this removes it from all of them.` : '';
    if (!window.confirm(`Permanently delete "${name}"? This cannot be undone.${extra}`)) return;
    setDeleting(true);
    try {
      await apiFetch(`/products/${productId}`, { method: 'DELETE' });
      router.push(listPath);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete product.');
      setDeleting(false);
    }
  }

  const sanitizedDescription = DOMPurify.sanitize(description);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
        {error && <Alert variant="error">{error}</Alert>}

        {mode === 'edit' && (initial?.catalogIds?.length || 0) > 1 && (
          <Alert variant="info">
            This product is used in {initial!.catalogIds!.length} catalogs — editing it here updates it
            everywhere.
          </Alert>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Product Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <div className="mt-1">
            <ReactQuill theme="snow" value={description} onChange={setDescription} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Price</label>
            <div className="mt-1 flex rounded-lg border border-gray-300 focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600">
              <span className="flex items-center px-3 text-sm text-gray-500">{symbol}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-r-lg px-2 py-2 text-sm focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Unit</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tax (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={taxPercent}
              onChange={(e) => setTaxPercent(e.target.value)}
              placeholder="e.g. 5"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
            <p className="mt-1 text-xs text-gray-400">Optional. Shown as &quot;+X% tax&quot; next to the price.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Minimum Order Quantity</label>
            <input
              type="number"
              min="1"
              value={moq}
              onChange={(e) => setMoq(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
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
            <div className="mt-2 flex gap-2">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="New category name"
                className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                disabled={addingCategory || !newCategoryName.trim()}
                className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Specifications</label>
          {Object.keys(specs).length > 0 && (
            <div className="mt-2 space-y-2">
              {Object.entries(specs).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-32 shrink-0 truncate text-sm text-gray-600">{key}</span>
                  <input
                    value={value}
                    onChange={(e) => setSpecs((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder="Value"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  />
                  <button
                    type="button"
                    onClick={() => removeSpec(key)}
                    className="shrink-0 text-gray-400 hover:text-red-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 flex gap-2">
            <select
              value=""
              onChange={(e) => {
                const specName = e.target.value;
                if (specName) setSpecs((prev) => ({ ...prev, [specName]: prev[specName] ?? '' }));
              }}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            >
              <option value="">+ Add specification…</option>
              {specMaster
                .filter((s) => !(s.name in specs))
                .map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={newSpecName}
              onChange={(e) => setNewSpecName(e.target.value)}
              placeholder="New specification name"
              className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
            <button
              type="button"
              onClick={handleAddSpecification}
              disabled={addingSpec || !newSpecName.trim()}
              className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Manage the full list from the{' '}
            <Link href="/dashboard/specifications" className="text-primary-700 hover:text-primary-800">
              Specifications
            </Link>{' '}
            page.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Images (up to 3)</label>
          <div className="mt-2 flex gap-3">
            {slots.map((slot, index) => (
              <div
                key={slot.key}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e: DragEvent) => e.preventDefault()}
                onDrop={() => handleDrop(index)}
                className="group relative h-24 w-24 cursor-move overflow-hidden rounded-lg border border-gray-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slot.previewUrl} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeSlot(slot.key)}
                  className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-red-600 opacity-0 shadow group-hover:opacity-100"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {slots.length < 3 && (
              <>
                <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 text-xs text-gray-400 hover:border-primary-400 hover:text-primary-600">
                  + Add
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleImagesPicked(e.target.files)}
                  />
                </label>
                {/* Distinct from the gallery picker above — `capture`
                    tells a mobile browser/PWA to launch the camera
                    directly instead of the file/photo chooser. Desktop
                    browsers ignore `capture` and just fall back to a
                    normal file picker, so this is harmless there. */}
                <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 text-xs text-gray-400 hover:border-primary-400 hover:text-primary-600 sm:hidden">
                  <CameraIcon className="h-5 w-5" />
                  Camera
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleImagesPicked(e.target.files)}
                  />
                </label>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-400">Drag to reorder. Max 5MB each — resized automatically.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Video URL</label>
          <input
            value={video}
            onChange={(e) => setVideo(e.target.value)}
            placeholder="https://youtube.com/..."
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
          />
          <p className="mt-1 text-xs text-gray-400">
            Paste a link for now — direct video file upload arrives in a later build phase.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving…' : mode === 'create' ? 'Create Product' : 'Save Changes'}
          </button>
          {mode === 'edit' && (
            <button
              type="button"
              onClick={handleDeletePermanently}
              disabled={deleting}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              {deleting ? 'Deleting…' : 'Delete Permanently'}
            </button>
          )}
        </div>
      </form>

      {/* Live preview — approximates the public catalog product card (Prompt 15). */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Preview</p>
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <div className="flex h-40 items-center justify-center bg-gray-100">
            {slots[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={slots[0].previewUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-gray-400">No image</span>
            )}
          </div>
          <div className="p-3">
            <p className="truncate text-sm font-semibold text-gray-900">{name || 'Product name'}</p>
            <p className="mt-1 text-sm text-gray-600">
              {symbol}{price || '0'} <span className="text-xs text-gray-400">/ {unit}</span>
              {taxPercent && <span className="text-xs text-gray-400"> (+{taxPercent}% tax)</span>}
            </p>
            {description && (
              <div
                className="mt-2 line-clamp-3 text-xs text-gray-500"
                dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
