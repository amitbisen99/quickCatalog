import { useState } from 'react';
import Modal from '@/components/Modal';
import Alert from '@/components/Alert';
import { apiFetch, ApiError } from '@/utils/api';
import { FREE_CATALOG_LIMIT, FREE_PRODUCT_LIMIT } from '@/utils/planLimit';
import { useAuth } from '@/context/AuthContext';

type Reason = 'catalog' | 'product' | 'generic';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reason?: Reason;
  // Called after a successful upgrade, before the modal closes — e.g. to
  // retry whatever action just got blocked by the limit.
  onUpgraded?: () => void;
}

const REASON_COPY: Record<Reason, { title: string; body: string }> = {
  catalog: {
    title: "You've reached the Free plan's catalog limit",
    body: `The Free plan includes ${FREE_CATALOG_LIMIT} catalog. Upgrade to Paid for unlimited catalogs and products.`,
  },
  product: {
    title: "You've reached the Free plan's product limit",
    body: `The Free plan includes ${FREE_PRODUCT_LIMIT} products. Upgrade to Paid for unlimited catalogs and products.`,
  },
  generic: {
    title: 'Upgrade to the Paid plan',
    body: 'Unlock unlimited catalogs and unlimited products — everything else stays exactly the same.',
  },
};

// There's no payment gateway wired up yet — this records a plan choice
// directly (PUT /users/upgrade-plan) rather than collecting billing
// details, matching the honest "trust upgrade" the backend endpoint
// itself documents. Shared by every place a vendor can hit a free-tier
// limit or choose to upgrade: the catalog/product limit errors, the
// Settings > Subscription section, and the header's Upgrade button.
export default function UpgradePlanModal({ isOpen, onClose, reason = 'generic', onUpgraded }: Props) {
  const { refreshUser } = useAuth();
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState('');
  const copy = REASON_COPY[reason];

  async function handleUpgrade() {
    setUpgrading(true);
    setError('');
    try {
      await apiFetch('/users/upgrade-plan', { method: 'PUT' });
      await refreshUser();
      onUpgraded?.();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upgrade your plan. Please try again.');
    } finally {
      setUpgrading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upgrade to Paid">
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">{copy.title}</p>
          <p className="mt-1 text-sm text-gray-600">{copy.body}</p>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <ul className="space-y-1.5 rounded-lg bg-primary-50 p-4 text-sm text-primary-900">
          <li>✓ Unlimited catalogs</li>
          <li>✓ Unlimited products</li>
          <li>✓ Everything else stays exactly the same</li>
        </ul>

        <div className="flex items-center gap-3">
          <button
            onClick={handleUpgrade}
            disabled={upgrading}
            className="rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {upgrading ? 'Upgrading…' : 'Upgrade to Paid'}
          </button>
          <button type="button" onClick={onClose} className="text-sm font-medium text-gray-500 hover:text-gray-700">
            Not now
          </button>
        </div>
      </div>
    </Modal>
  );
}
