import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import withAdminAuth from '@/components/withAdminAuth';
import Alert from '@/components/Alert';
import { DownloadIcon } from '@/components/icons';
import { apiFetch, ApiError } from '@/utils/api';
import { LEAD_STATUS_STYLES, LEAD_STATUS_LABEL, CatalogPreviewLeadStatus } from '@/utils/catalogPreviewLead';

interface LeadDetail {
  id: string;
  fullName: string;
  email: string;
  whatsappNo: string;
  industry: string;
  numberOfProducts: number;
  excelFileName: string;
  excelFileData: string; // data: URL
  status: CatalogPreviewLeadStatus;
  createdAt: string;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value ?? '—'}</dd>
    </div>
  );
}

function LeadDetailPage() {
  const router = useRouter();
  const leadId = typeof router.query.leadId === 'string' ? router.query.leadId : '';

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!leadId) return;
    apiFetch<{ lead: LeadDetail }>(`/admin/catalog-preview-leads/${leadId}`)
      .then((res) => setLead(res.lead))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load this lead.'));
  }, [leadId]);

  async function handleStatusChange(status: CatalogPreviewLeadStatus) {
    setUpdatingStatus(true);
    try {
      const res = await apiFetch<{ lead: LeadDetail }>(`/admin/catalog-preview-leads/${leadId}/status`, {
        method: 'PUT',
        body: { status },
      });
      setLead((prev) => (prev ? { ...prev, status: res.lead.status } : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update status.');
    } finally {
      setUpdatingStatus(false);
    }
  }

  if (!lead) {
    return (
      <AdminLayout title="Catalog Preview Lead">
        <Link href="/admin/catalog-preview-leads" className="text-sm font-medium text-gray-500 hover:text-primary-700">
          ← Back to leads
        </Link>
        <div className="mt-4">{error ? <Alert variant="error">{error}</Alert> : <p className="text-sm text-gray-500">Loading…</p>}</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Catalog Preview Lead">
      <Link href="/admin/catalog-preview-leads" className="text-sm font-medium text-gray-500 hover:text-primary-700">
        ← Back to leads
      </Link>

      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{lead.fullName}</h1>
                <p className="mt-1 text-xs text-gray-400">Submitted {new Date(lead.createdAt).toLocaleString()}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${LEAD_STATUS_STYLES[lead.status]}`}>
                {LEAD_STATUS_LABEL[lead.status]}
              </span>
            </div>

            <dl className="mt-6 grid grid-cols-1 gap-6 border-t border-gray-100 pt-6 sm:grid-cols-2">
              <Field label="Email" value={lead.email} />
              <Field label="WhatsApp Number" value={lead.whatsappNo} />
              <Field label="Industry" value={lead.industry} />
              <Field label="Number of Products" value={lead.numberOfProducts} />
            </dl>

            <div className="mt-6 border-t border-gray-100 pt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Product File</p>
              <a
                href={lead.excelFileData}
                download={lead.excelFileName}
                className="mt-2 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <DownloadIcon className="h-4 w-4" />
                {lead.excelFileName}
              </a>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Status</label>
            <select
              value={lead.status}
              onChange={(e) => handleStatusChange(e.target.value as CatalogPreviewLeadStatus)}
              disabled={updatingStatus}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="delivered">Preview Delivered</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default withAdminAuth(LeadDetailPage);
