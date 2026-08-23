import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import Alert from '@/components/Alert';
import { apiFetch, ApiError } from '@/utils/api';
import { FREE_CATALOG_LIMIT, FREE_PRODUCT_LIMIT } from '@/utils/planLimit';
import { currencySymbol } from '@/utils/currency';
import { openRazorpayCheckout, RazorpaySuccessResponse } from '@/utils/razorpay';
import { useAuth } from '@/context/AuthContext';

type Reason = 'catalog' | 'product' | 'domain' | 'generic';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reason?: Reason;
  // Called after a successful upgrade, before the modal closes — e.g. to
  // retry whatever action just got blocked by the limit.
  onUpgraded?: () => void;
}

interface PlanPrice {
  amount: number;
  currency: string;
  alreadyPaid: boolean;
}

interface OrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
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
  domain: {
    title: 'Connect your own domain',
    body: 'Custom domains are a Paid plan feature — point your own domain (like catalog.yourbrand.com) at your catalog instead of sharing our link.',
  },
  generic: {
    title: 'Upgrade to the Paid plan',
    body: 'Unlock unlimited catalogs and unlimited products — everything else stays exactly the same.',
  },
};

// Real payment via Razorpay: create an order for the vendor's resolved
// price (India vs international, decided server-side from their account
// currency), open Razorpay's checkout, then verify the signed result
// before the account actually gets marked Paid. Shared by every place a
// vendor can hit a free-tier limit or choose to upgrade: the
// catalog/product limit errors, Settings > Subscription, and the
// header's Upgrade button.
export default function UpgradePlanModal({ isOpen, onClose, reason = 'generic', onUpgraded }: Props) {
  const { user, refreshUser } = useAuth();
  const [price, setPrice] = useState<PlanPrice | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState('');
  const copy = REASON_COPY[reason];

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    apiFetch<PlanPrice>('/payments/plan-price')
      .then(setPrice)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load pricing. Please try again.'));
  }, [isOpen]);

  async function handleUpgrade() {
    setUpgrading(true);
    setError('');
    try {
      const order = await apiFetch<OrderResponse>('/payments/razorpay/order', { method: 'POST' });

      await openRazorpayCheckout({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'QuickCatalog',
        description: 'Upgrade to the Paid plan',
        prefill: {
          name: user?.businessName,
          email: user?.email,
          contact: user?.mobileNo,
        },
        theme: { color: '#232153' },
        handler: (response: RazorpaySuccessResponse) => {
          verifyPayment(response);
        },
        modal: {
          // Vendor closed the Razorpay popup without paying — not an
          // error, just let them try again.
          ondismiss: () => setUpgrading(false),
        },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start checkout. Please try again.');
      setUpgrading(false);
    }
  }

  async function verifyPayment(response: RazorpaySuccessResponse) {
    try {
      await apiFetch('/payments/razorpay/verify', {
        method: 'POST',
        body: {
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        },
      });
      await refreshUser();
      onUpgraded?.();
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Payment succeeded but could not be verified — contact support before trying again.'
      );
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
            disabled={upgrading || !price || price.alreadyPaid}
            className="rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {upgrading
              ? 'Processing…'
              : price
                ? `Pay ${currencySymbol(price.currency)}${price.amount} & Upgrade`
                : 'Loading…'}
          </button>
          <button type="button" onClick={onClose} className="text-sm font-medium text-gray-500 hover:text-gray-700">
            Not now
          </button>
        </div>
      </div>
    </Modal>
  );
}
