import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import Alert from '@/components/Alert';
import { apiFetch, ApiError } from '@/utils/api';

interface Enquiry {
  id: string;
  catalogId: string;
  catalogName: string;
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  items: { productId?: string; name: string; price: number; taxPercent?: number; unit?: string; quantity: number }[];
  status: 'new' | 'contacted' | 'closed';
  createdAt: string;
}

const STATUS_STYLES: Record<Enquiry['status'], string> = {
  new: 'bg-blue-50 text-blue-700',
  contacted: 'bg-amber-50 text-amber-700',
  closed: 'bg-gray-100 text-gray-600',
};

function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[] | null>(null);
  const [error, setError] = useState('');

  function loadEnquiries() {
    apiFetch<{ enquiries: Enquiry[] }>('/enquiries')
      .then((res) => setEnquiries(res.enquiries))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load enquiries.'));
  }

  useEffect(loadEnquiries, []);

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
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Catalog</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Products</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Status</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Date</th>
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
                    <td className="hidden px-4 py-3 text-gray-600 sm:table-cell">{enquiry.catalogName}</td>
                    <td className="hidden px-4 py-3 text-gray-600 sm:table-cell">
                      {enquiry.items.length} product{enquiry.items.length === 1 ? '' : 's'}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[enquiry.status]}`}>
                        {enquiry.status}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">
                      {new Date(enquiry.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/enquiries/${enquiry.id}`}
                        className="text-xs font-semibold text-primary-700 hover:text-primary-800"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default withAuth(EnquiriesPage);
