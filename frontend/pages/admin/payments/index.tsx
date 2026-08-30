import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import withAdminAuth from '@/components/withAdminAuth';
import Alert from '@/components/Alert';
import { EyeIcon } from '@/components/icons';
import { apiFetch, ApiError } from '@/utils/api';
import { currencySymbol } from '@/utils/currency';
import { PAYMENT_STATUS_STYLES, PAYMENT_STATUS_LABEL, PaymentStatus, formatPaymentAmount } from '@/utils/payment';

interface PaymentVendor {
  id: string;
  businessName?: string;
  email: string;
  mobileNo?: string;
  countryCode?: string;
}

interface PaymentSummary {
  id: string;
  vendor: PaymentVendor;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
}

interface PaymentsResponse {
  payments: PaymentSummary[];
  total: number;
  page: number;
  pages: number;
}

function Payments() {
  const [data, setData] = useState<PaymentsResponse | null>(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const loadPayments = useCallback(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    params.set('page', String(page));

    apiFetch<PaymentsResponse>(`/admin/payments?${params}`)
      .then((res) => setData(res))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load payments.'));
  }, [status, page]);

  useEffect(loadPayments, [loadPayments]);

  return (
    <AdminLayout title="Payments">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
        <p className="mt-1 text-sm text-gray-500">Every Razorpay order started by a vendor, including abandoned and failed attempts.</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
        >
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="created">Created (Unpaid)</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {data === null ? (
          <p className="p-6 text-sm text-gray-500">Loading…</p>
        ) : data.payments.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-gray-900">No payments found</p>
            <p className="mt-1 text-sm text-gray-500">Try a different filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Order ID</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{payment.vendor.businessName || '—'}</p>
                      <p className="text-xs text-gray-500">{payment.vendor.email}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{payment.razorpayOrderId}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {currencySymbol(payment.currency)}
                      {formatPaymentAmount(payment.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PAYMENT_STATUS_STYLES[payment.status]}`}>
                        {PAYMENT_STATUS_LABEL[payment.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{new Date(payment.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/payments/${payment.id}`}
                        className="text-gray-400 hover:text-primary-700"
                        title="View details"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={data.page <= 1}
            className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-gray-500">
            Page {data.page} of {data.pages} · {data.total} payment{data.total === 1 ? '' : 's'}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={data.page >= data.pages}
            className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </AdminLayout>
  );
}

export default withAdminAuth(Payments);
