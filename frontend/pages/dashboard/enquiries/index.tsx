import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import Alert from '@/components/Alert';
import Modal from '@/components/Modal';
import { apiFetch, ApiError } from '@/utils/api';
import { currencySymbol } from '@/utils/currency';
import { useAuth } from '@/context/AuthContext';

interface EnquiryItem {
  productId?: string;
  name: string;
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

function EnquiriesPage() {
  const { user } = useAuth();
  const symbol = currencySymbol(user?.currency);
  const [enquiries, setEnquiries] = useState<Enquiry[] | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [updating, setUpdating] = useState(false);

  function loadEnquiries() {
    apiFetch<{ enquiries: Enquiry[] }>('/enquiries')
      .then((res) => setEnquiries(res.enquiries))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load enquiries.'));
  }

  useEffect(loadEnquiries, []);

  async function handleStatusChange(id: string, status: Enquiry['status']) {
    setUpdating(true);
    try {
      const res = await apiFetch<{ enquiry: Enquiry }>(`/enquiries/${id}/status`, {
        method: 'PUT',
        body: { status },
      });
      setEnquiries((prev) => prev?.map((e) => (e.id === id ? res.enquiry : e)) || null);
      setSelected(res.enquiry);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update status.');
    } finally {
      setUpdating(false);
    }
  }

  const itemsTotal = (items: EnquiryItem[]) => items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <DashboardLayout title="Enquiries">
      <h1 className="text-3xl font-bold text-gray-900">Enquiries</h1>
      <p className="mt-1 text-sm text-gray-500">Product enquiries submitted from your public catalogs.</p>

      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {enquiries === null ? (
          <p className="p-6 text-sm text-gray-500">Loading…</p>
        ) : enquiries.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-gray-900">No enquiries yet</p>
            <p className="mt-1 text-sm text-gray-500">
              When a visitor sends an enquiry from one of your catalogs, it&apos;ll show up here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Catalog</th>
                  <th className="px-4 py-3 font-medium">Products</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {enquiries.map((enquiry) => (
                  <tr key={enquiry.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{enquiry.customerName}</p>
                      <p className="text-xs text-gray-500">{enquiry.customerMobile}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{enquiry.catalogName}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {enquiry.items.length} product{enquiry.items.length === 1 ? '' : 's'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[enquiry.status]}`}>
                        {enquiry.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{new Date(enquiry.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(enquiry)} className="text-xs font-semibold text-primary-700 hover:text-primary-800">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Enquiry Details">
        {selected && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">{selected.customerName}</p>
              <p className="text-sm text-gray-600">{selected.customerMobile}</p>
              {selected.customerEmail && <p className="text-sm text-gray-600">{selected.customerEmail}</p>}
              <p className="mt-1 text-xs text-gray-400">
                {selected.catalogName} · {new Date(selected.createdAt).toLocaleString()}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Products</p>
              <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200">
                {selected.items.map((item, i) => (
                  <li key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {symbol}{item.price} × {item.quantity} {item.unit || 'pcs'}
                        {item.taxPercent ? ` (+${item.taxPercent}% tax)` : ''}
                      </p>
                    </div>
                    <p className="font-medium text-gray-900">{symbol}{item.price * item.quantity}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-right text-sm font-semibold text-gray-900">
                Total: {symbol}{itemsTotal(selected.items)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Status</label>
              <select
                value={selected.status}
                onChange={(e) => handleStatusChange(selected.id, e.target.value as Enquiry['status'])}
                disabled={updating}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <a
              href={`https://wa.me/${selected.customerMobile.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800"
            >
              Contact on WhatsApp
            </a>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}

export default withAuth(EnquiriesPage);
