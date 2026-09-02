import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import withAdminAuth from '@/components/withAdminAuth';
import Alert from '@/components/Alert';
import { EyeIcon } from '@/components/icons';
import { apiFetch, ApiError } from '@/utils/api';
import { LEAD_STATUS_STYLES, LEAD_STATUS_LABEL, CatalogPreviewLeadStatus } from '@/utils/catalogPreviewLead';

interface LeadSummary {
  id: string;
  fullName: string;
  email: string;
  whatsappNo: string;
  industry: string;
  numberOfProducts: number;
  excelFileName: string;
  status: CatalogPreviewLeadStatus;
  createdAt: string;
}

interface LeadsResponse {
  leads: LeadSummary[];
  total: number;
  page: number;
  pages: number;
}

function CatalogPreviewLeads() {
  const [data, setData] = useState<LeadsResponse | null>(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const loadLeads = useCallback(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    params.set('page', String(page));

    apiFetch<LeadsResponse>(`/admin/catalog-preview-leads?${params}`)
      .then((res) => setData(res))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load leads.'));
  }, [status, page]);

  useEffect(loadLeads, [loadLeads]);

  return (
    <AdminLayout title="Catalog Preview Leads">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Catalog Preview Leads</h1>
        <p className="mt-1 text-sm text-gray-500">
          Everyone who submitted their product Excel on the &ldquo;Free Catalog Preview&rdquo; landing page.
        </p>
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
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="delivered">Preview Delivered</option>
          <option value="closed">Closed</option>
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
        ) : data.leads.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-gray-900">No leads found</p>
            <p className="mt-1 text-sm text-gray-500">Try a different filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Industry</th>
                  <th className="px-4 py-3 font-medium">Products</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.leads.map((lead) => (
                  <tr key={lead.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{lead.fullName}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900">{lead.email}</p>
                      <p className="text-xs text-gray-500">{lead.whatsappNo}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{lead.industry}</td>
                    <td className="px-4 py-3 text-gray-600">{lead.numberOfProducts}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${LEAD_STATUS_STYLES[lead.status]}`}>
                        {LEAD_STATUS_LABEL[lead.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{new Date(lead.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/catalog-preview-leads/${lead.id}`}
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
            Page {data.page} of {data.pages} · {data.total} lead{data.total === 1 ? '' : 's'}
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

export default withAdminAuth(CatalogPreviewLeads);
