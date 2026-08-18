import { FormEvent, useState } from 'react';
import { useRouter } from 'next/router';
import Modal from '@/components/Modal';
import Alert from '@/components/Alert';
import { UploadIcon, PencilIcon } from '@/components/icons';
import { apiFetch, ApiError } from '@/utils/api';
import { isPlanLimitError } from '@/utils/planLimit';

interface CatalogSummary {
  id: string;
  name: string;
  description?: string;
  slug: string;
  qrCode?: string;
  productsCount: number;
  createdAt: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (catalog: CatalogSummary) => void;
  // Free-tier catalog cap hit — the parent closes this modal and opens
  // the shared upgrade prompt instead of just showing the raw error here.
  onPlanLimitHit?: () => void;
}

type Step = 'choose' | 'manual';

// "Import File" hands off to the full guided wizard
// (frontend/pages/dashboard/catalogs/create.tsx) — catalog details, Excel +
// image ZIP upload, preview, plan, done, all in one flow. "Create Manually"
// stays right here: just a name + description, then the vendor lands on
// the new (empty) catalog's own page to add products one at a time.
export default function CreateCatalogModal({ isOpen, onClose, onCreated, onPlanLimitHit }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('choose');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function reset() {
    setStep('choose');
    setName('');
    setDescription('');
    setError('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Catalog name is required');
      return;
    }

    setLoading(true);
    try {
      const result = await apiFetch<{ catalog: CatalogSummary }>('/catalogs', {
        method: 'POST',
        body: { name, description },
      });
      onCreated(result.catalog);
      reset();
    } catch (err) {
      if (isPlanLimitError(err) && onPlanLimitHit) {
        handleClose();
        onPlanLimitHit();
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Catalog">
      {step === 'choose' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            onClick={() => router.push('/dashboard/catalogs/create')}
            className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 p-6 text-center hover:border-primary-300 hover:bg-primary-50"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-100 text-primary-700">
              <UploadIcon className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Import File</span>
            <span className="text-xs text-gray-500">Guided step-by-step Excel import</span>
          </button>

          <button
            onClick={() => setStep('manual')}
            className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 p-6 text-center hover:border-primary-300 hover:bg-primary-50"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary-100 text-secondary-700">
              <PencilIcon className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Create Manually</span>
            <span className="text-xs text-gray-500">Start with an empty catalog</span>
          </button>
        </div>
      )}

      {step === 'manual' && (
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          <div>
            <label htmlFor="catalogName" className="block text-sm font-medium text-gray-700">
              Catalog Name
            </label>
            <input
              id="catalogName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
              placeholder="Summer Collection 2026"
            />
          </div>

          <div>
            <label htmlFor="catalogDescription" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="catalogDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={200}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
              placeholder="Optional description shown on your public catalog page"
            />
            <p className="mt-1 text-right text-xs text-gray-400">{description.length}/200</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Creating…' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setStep('choose')}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
