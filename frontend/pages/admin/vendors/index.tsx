import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import withAdminAuth from '@/components/withAdminAuth';
import Alert from '@/components/Alert';
import { EyeIcon, DownloadIcon } from '@/components/icons';
import { apiFetch, ApiError } from '@/utils/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface VendorSummary {
  id: string;
  businessName?: string;
  email: string;
  mobileNo: string;
  status: string;
  subscriptionType: string;
}

interface VendorsResponse {
  users: VendorSummary[];
  total: number;
  page: number;
  pages: number;
}

function Vendors() {
  const [data, setData] = useState<VendorsResponse | null>(null);
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const loadVendors = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (plan) params.set('plan', plan);
    params.set('page', String(page));

    apiFetch<{ users: VendorSummary[]; total: number; page: number; pages: number }>(`/admin/users?${params}`)
      .then((res) => setData(res))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load vendors.'));
  }, [search, plan, page]);

  useEffect(loadVendors, [loadVendors]);

  function exportUrl() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (plan) params.set('plan', plan);
    return `${API_URL}/admin/users/export?${params}`;
  }

  return (
    <AdminLayout title="Vendors">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendors</h1>
          <p className="mt-1 text-sm text-gray-500">All registered vendors on QuickCatalog.</p>
        </div>
        <a
          href={exportUrl()}
          download
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <DownloadIcon className="h-4 w-4" />
          Export to Excel
        </a>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by name, email, or mobile…"
          className="w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
        />
        <select
          value={plan}
          onChange={(e) => {
            setPlan(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
        >
          <option value="">All plans</option>
          <option value="free">Free</option>
          <option value="paid">Paid</option>
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
        ) : data.users.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-gray-900">No vendors found</p>
            <p className="mt-1 text-sm text-gray-500">Try a different search or filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Mobile</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.users.map((vendor) => (
                  <tr key={vendor.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{vendor.businessName || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{vendor.email}</td>
                    <td className="px-4 py-3 text-gray-600">{vendor.mobileNo}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/vendors/${vendor.id}`}
                        className="text-gray-400 hover:text-primary-700"
                        title="View"
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
            Page {data.page} of {data.pages} · {data.total} vendor{data.total === 1 ? '' : 's'}
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

export default withAdminAuth(Vendors);
