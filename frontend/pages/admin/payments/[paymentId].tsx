import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import withAdminAuth from '@/components/withAdminAuth';
import Alert from '@/components/Alert';
import { apiFetch, ApiError } from '@/utils/api';
import { currencySymbol } from '@/utils/currency';
import { PAYMENT_STATUS_STYLES, PAYMENT_STATUS_LABEL, PaymentStatus, formatPaymentAmount } from '@/utils/payment';

interface PaymentVendor {
  id: string;
  businessName?: string;
  email: string;
  mobileNo?: string;
  countryCode?: string;
  subscriptionType?: string;
  subscriptionExpiresAt?: string;
}

interface PaymentDetail {
  id: string;
  vendor: PaymentVendor;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className={`mt-1 text-sm text-gray-900 ${mono ? 'break-all font-mono text-xs' : ''}`}>{value ?? '—'}</dd>
    </div>
  );
}

function PaymentDetailPage() {
  const router = useRouter();
  const paymentId = typeof router.query.paymentId === 'string' ? router.query.paymentId : '';

  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!paymentId) return;
    apiFetch<{ payment: PaymentDetail }>(`/admin/payments/${paymentId}`)
      .then((res) => setPayment(res.payment))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load this payment.'));
  }, [paymentId]);

  if (!payment) {
    return (
      <AdminLayout title="Payment">
        <Link href="/admin/payments" className="text-sm font-medium text-gray-500 hover:text-primary-700">
          ← Back to payments
        </Link>
        <div className="mt-4">{error ? <Alert variant="error">{error}</Alert> : <p className="text-sm text-gray-500">Loading…</p>}</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Payment">
      <Link href="/admin/payments" className="text-sm font-medium text-gray-500 hover:text-primary-700">
        ← Back to payments
      </Link>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {currencySymbol(payment.currency)}
              {formatPaymentAmount(payment.amount)} {payment.currency}
            </h1>
            <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${PAYMENT_STATUS_STYLES[payment.status]}`}>
              {PAYMENT_STATUS_LABEL[payment.status]}
            </span>
          </div>
        </div>

        <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-gray-400">Transaction</h2>
        <dl className="mt-3 grid grid-cols-1 gap-6 border-t border-gray-100 pt-6 sm:grid-cols-2">
          <Field label="Razorpay Order ID" value={payment.razorpayOrderId} mono />
          <Field label="Razorpay Payment ID" value={payment.razorpayPaymentId} mono />
          <Field label="Razorpay Signature" value={payment.razorpaySignature} mono />
          <Field
            label="Amount"
            value={`${currencySymbol(payment.currency)}${formatPaymentAmount(payment.amount)} (${payment.amount} ${payment.currency === 'INR' ? 'paise' : 'cents'})`}
          />
          <Field label="Created" value={new Date(payment.createdAt).toLocaleString()} />
          <Field label="Last Updated" value={new Date(payment.updatedAt).toLocaleString()} />
        </dl>

        <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-gray-400">Vendor</h2>
        <dl className="mt-3 grid grid-cols-1 gap-6 border-t border-gray-100 pt-6 sm:grid-cols-2">
          <Field label="Business Name" value={payment.vendor.businessName} />
          <Field label="Email" value={payment.vendor.email} />
          <Field
            label="Mobile"
            value={payment.vendor.mobileNo ? `${payment.vendor.countryCode || ''} ${payment.vendor.mobileNo}` : undefined}
          />
          <Field label="Current Plan" value={payment.vendor.subscriptionType} />
          <Field
            label="Plan Expires"
            value={payment.vendor.subscriptionExpiresAt ? new Date(payment.vendor.subscriptionExpiresAt).toLocaleDateString() : undefined}
          />
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Vendor Profile</dt>
            <dd className="mt-1 text-sm">
              <Link href={`/admin/vendors/${payment.vendor.id}`} className="font-medium text-primary-700 hover:text-primary-800">
                View full vendor profile →
              </Link>
            </dd>
          </div>
        </dl>
      </div>
    </AdminLayout>
  );
}

export default withAdminAuth(PaymentDetailPage);
