import { useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import Alert from '@/components/Alert';
import { apiFetch, ApiError } from '@/utils/api';
import { currencySymbol } from '@/utils/currency';

type Mode = 'increasePercent' | 'decreasePercent' | 'increaseAmount' | 'decreaseAmount' | 'setExact';

const MODE_LABELS: Record<Mode, string> = {
  increasePercent: 'Increase price by %',
  decreasePercent: 'Decrease price by %',
  increaseAmount: 'Increase price by amount',
  decreaseAmount: 'Decrease price by amount',
  setExact: 'Set to exact price',
};

export interface BulkPriceProduct {
  id: string;
  name: string;
  price: number;
  catalogIds: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  products: BulkPriceProduct[];
  currency?: string;
  // Called after a successful apply — the caller reloads its list and
  // clears the selection; this component doesn't own that state.
  onApplied: () => void;
}

function computeNewPrice(mode: Mode, value: number, price: number): number {
  let next = price;
  if (mode === 'increasePercent') next = price * (1 + value / 100);
  else if (mode === 'decreasePercent') next = price * (1 - value / 100);
  else if (mode === 'increaseAmount') next = price + value;
  else if (mode === 'decreaseAmount') next = price - value;
  else if (mode === 'setExact') next = value;
  // Never write a negative price — a decrease bigger than the current
  // price just floors at 0 rather than rejecting the whole batch.
  return Math.max(0, Math.round(next * 100) / 100);
}

// Takes the already-loaded selected products (the list page rendered
// them, so their current prices are already in memory) and computes +
// previews the new price for each entirely client-side, then sends the
// exact final values to the backend — what the vendor sees in the
// preview table is exactly what gets written, no separate server-side
// math to disagree with it on rounding.
export default function BulkPriceModal({ isOpen, onClose, products, currency, onApplied }: Props) {
  const [mode, setMode] = useState<Mode>('increasePercent');
  const [value, setValue] = useState('');
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const symbol = currencySymbol(currency);
  const isPercent = mode === 'increasePercent' || mode === 'decreasePercent';

  const numericValue = Number(value);
  const valid = value.trim() !== '' && !Number.isNaN(numericValue) && (mode === 'setExact' ? numericValue >= 0 : numericValue > 0);

  const preview = useMemo(
    () => products.map((p) => ({ ...p, newPrice: valid ? computeNewPrice(mode, numericValue, p.price) : p.price })),
    [products, mode, numericValue, valid]
  );

  const sharedCount = products.filter((p) => p.catalogIds.length > 1).length;

  async function handleApply() {
    if (!valid) return;
    setApplying(true);
    setError('');
    try {
      await apiFetch('/products/bulk-price', {
        method: 'PUT',
        body: { updates: preview.map((p) => ({ productId: p.id, price: p.newPrice })) },
      });
      onApplied();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update prices. Please try again.');
    } finally {
      setApplying(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Adjust Price — ${products.length} product${products.length === 1 ? '' : 's'}`}
      maxWidthClassName="max-w-xl"
    >
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Action</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            >
              {(Object.keys(MODE_LABELS) as Mode[]).map((key) => (
                <option key={key} value={key}>
                  {MODE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {mode === 'setExact' ? 'New price' : isPercent ? 'Percent' : 'Amount'}
            </label>
            <div className="mt-1 flex rounded-lg border border-gray-300 focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600">
              <input
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={isPercent ? 'e.g. 10' : 'e.g. 50'}
                className="w-full min-w-0 rounded-lg px-3 py-2 text-sm focus:outline-none"
              />
              <span className="flex shrink-0 items-center px-3 text-sm text-gray-500">{isPercent ? '%' : symbol}</span>
            </div>
          </div>
        </div>

        {sharedCount > 0 && (
          <Alert variant="info">
            {sharedCount} of these {products.length} product{products.length === 1 ? '' : 's'} {sharedCount === 1 ? 'is' : 'are'} also
            used in other catalogs — this updates the price everywhere they appear, not just here.
          </Alert>
        )}

        <div>
          <p className="text-sm font-medium text-gray-700">Preview</p>
          <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Old price</th>
                  <th className="px-3 py-2 font-medium">New price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2 text-gray-900">{p.name}</td>
                    <td className="px-3 py-2 text-gray-500">
                      {symbol}
                      {p.price}
                    </td>
                    <td className={`px-3 py-2 font-medium ${p.newPrice !== p.price ? 'text-primary-700' : 'text-gray-500'}`}>
                      {symbol}
                      {p.newPrice}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleApply}
            disabled={!valid || applying}
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
