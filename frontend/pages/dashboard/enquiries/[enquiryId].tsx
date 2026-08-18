import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import Alert from '@/components/Alert';
import { apiFetch, ApiError } from '@/utils/api';
import { currencySymbol } from '@/utils/currency';
import { useAuth } from '@/context/AuthContext';

interface EnquiryItem {
  productId?: string;
  name: string;
  sku?: string;
  price: number;
  taxPercent?: number;
  unit?: string;
  quantity: number;
}

interface Enquiry {
  id: string;
  catalogId: string;
  catalogName: string;
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  items: EnquiryItem[];
  status: 'new' | 'contacted' | 'closed';
  createdAt: string;
}

const STATUS_STYLES: Record<Enquiry['status'], string> = {
  new: 'bg-blue-50 text-blue-700',
  contacted: 'bg-amber-50 text-amber-700',
  closed: 'bg-gray-100 text-gray-600',
};

function EnquiryDetail() {
  const router = useRouter();
  const { user } = useAuth();
  const symbol = currencySymbol(user?.currency);
  const enquiryId = typeof router.query.enquiryId === 'string' ? router.query.enquiryId : '';

  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!enquiryId) return;
    apiFetch<{ enquiry: Enquiry }>(`/enquiries/${enquiryId}`)
      .then((res) => setEnquiry(res.enquiry))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load this enquiry.'));
  }, [enquiryId]);

  async function handleStatusChange(status: Enquiry['status']) {
    if (!enquiry) return;
    setUpdating(true);
    try {
      const res = await apiFetch<{ enquiry: Enquiry }>(`/enquiries/${enquiry.id}/status`, {
        method: 'PUT',
        body: { status },
      });
      setEnquiry(res.enquiry);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update status.');
    } finally {
      setUpdating(false);
    }
  }

  const itemsTotal = (items: EnquiryItem[]) => items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <DashboardLayout title="Enquiry">
      <Link href="/dashboard/enquiries" className="text-sm font-medium text-gray-500 hover:text-primary-700">
        ← Back to enquiries
      </Link>

      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {!enquiry && !error && <p className="mt-6 text-sm text-gray-500">Loading…</p>}

      {enquiry && (
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{enquiry.customerName}</h1>
                  <p className="mt-1 text-sm text-gray-600">{enquiry.customerMobile}</p>
                  {enquiry.customerEmail && <p className="text-sm text-gray-600">{enquiry.customerEmail}</p>}
                  <p className="mt-1 text-xs text-gray-400">
                    {enquiry.catalogName} · {new Date(enquiry.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[enquiry.status]}`}>
                  {enquiry.status}
                </span>
              </div>

              <a
                href={`https://wa.me/${enquiry.customerMobile.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800 sm:w-auto"
              >
                Contact on WhatsApp
              </a>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <p className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Products ({enquiry.items.length})
              </p>
              <ul className="divide-y divide-gray-100">
                {enquiry.items.map((item, i) => (
                  <li key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium text-gray-900">
                        {item.name}
                        {item.sku && <span className="ml-1.5 text-xs font-normal text-gray-400">(SKU: {item.sku})</span>}
                      </p>
                      <p className="text-xs text-gray-500">
                        {symbol}{item.price} × {item.quantity} {item.unit || 'pcs'}
                        {item.taxPercent ? ` (+${item.taxPercent}% tax)` : ''}
                      </p>
                    </div>
                    <p className="font-medium text-gray-900">{symbol}{item.price * item.quantity}</p>
                  </li>
                ))}
              </ul>
              <p className="border-t border-gray-200 px-4 py-3 text-right text-sm font-semibold text-gray-900">
                Total: {symbol}{itemsTotal(enquiry.items)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Status</label>
            <select
              value={enquiry.status}
              onChange={(e) => handleStatusChange(e.target.value as Enquiry['status'])}
              disabled={updating}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default withAuth(EnquiryDetail);
