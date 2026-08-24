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
        name: 'Instant Catalog',
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
    <Modal isOpen={isOpen} onClose={onClose} title="Get More With Premium" maxWidthClassName="max-w-2xl">
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">{copy.title}</p>
          <p className="mt-1 text-sm text-gray-600">{copy.body}</p>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {/* Called out separately from the plain checklist below — this is
            the USP that actually moves someone to buy (a real human
            builds their first catalog for them), so it gets its own
            gold-accented card instead of blending in as one bullet among
            eleven. */}
        <div className="flex items-start gap-3 rounded-lg border border-secondary-400 bg-secondary-50 p-4">
          <span className="text-xl">🎁</span>
          <p className="text-sm text-primary-950">
            <strong>Free Setup Help</strong> — send us your product Excel list and our team will build your first
            catalog for you, with two 1-hour setup calls included.
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-lg bg-primary-50 p-4 text-sm text-primary-900 sm:grid-cols-2">
          <li>✓ Unlimited catalogs</li>
          <li>✓ Unlimited products</li>
          <li>✓ Everything else stays exactly the same</li>
          <li>
            ✓ <strong>Your Own Branding</strong> — white-label on your domain
          </li>
          <li>
            ✓ <strong>Install as an App</strong> — manage catalogs from your mobile device, no app store needed
          </li>
          <li>
            ✓ <strong>Add to Your Website</strong> — embed code &amp; widget
          </li>
          <li>
            ✓ <strong>Views &amp; Clicks Tracking</strong> — simple stats on how many people viewed your catalog
            or specific products
          </li>
          <li>
            ✓ <strong>Bulk Upload</strong> — add many products at once via Excel/CSV
          </li>
          <li>
            ✓ <strong>Download as PDF</strong> — export your catalog to share or print
          </li>
          <li>
            ✓ <strong>Priority Support</strong> — faster help when you need it
          </li>
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
