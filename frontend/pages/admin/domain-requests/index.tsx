import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import withAdminAuth from '@/components/withAdminAuth';
import Alert from '@/components/Alert';
import { CheckCircleIcon, XIcon } from '@/components/icons';
import { apiFetch, ApiError } from '@/utils/api';

// One row per pending request — a vendor can have both a pending
// subdomain AND a pending customDomain at once (see backend/src/models/
// User.js), so `type` distinguishes which field this specific request is
// about even though both live on the same vendor document.
interface DomainRequest {
  vendorId: string;
  vendorBusinessName: string;
  vendorEmail: string;
  subdomain?: string;
  customDomain?: string;
  createdAt: string;
}

function DomainRequests() {
  const [requests, setRequests] = useState<DomainRequest[] | null>(null);
  const [error, setError] = useState('');
  const [actioningKey, setActioningKey] = useState('');

  const loadRequests = useCallback(() => {
    apiFetch<{ requests: DomainRequest[] }>('/admin/domain-requests')
      .then((res) => setRequests(res.requests))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load domain requests.'));
  }, []);

  useEffect(loadRequests, [loadRequests]);

  async function handleAction(vendorId: string, type: 'subdomain' | 'customDomain', status: 'active' | 'failed') {
    const key = `${vendorId}:${type}`;
    setActioningKey(key);
    setError('');
    try {
      await apiFetch(`/admin/domain-requests/${vendorId}`, { method: 'PUT', body: { type, status } });
      loadRequests();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update this request.');
    } finally {
      setActioningKey('');
    }
  }

  return (
    <AdminLayout title="Domain Requests">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Domain Requests</h1>
        <p className="mt-1 text-sm text-gray-500">
          This host has no domain-provisioning API — set each of these up in hPanel (subdomain, or Parked Domain +
          the vendor&apos;s DNS for a custom domain), confirm it resolves, then mark it live below. One domain
          covers every catalog that vendor owns.
        </p>
      </div>

      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {requests === null ? (
          <p className="p-6 text-sm text-gray-500">Loading…</p>
        ) : requests.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-gray-900">Nothing pending</p>
            <p className="mt-1 text-sm text-gray-500">New subdomain/custom-domain requests will show up here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Requested</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.flatMap((req) => {
                  const rows: { type: 'subdomain' | 'customDomain'; value: string; label: string }[] = [];
                  if (req.subdomain) rows.push({ type: 'subdomain', value: req.subdomain, label: 'Subdomain' });
                  if (req.customDomain) rows.push({ type: 'customDomain', value: req.customDomain, label: 'Custom domain' });

                  return rows.map((row) => {
                    const key = `${req.vendorId}:${row.type}`;
                    const actioning = actioningKey === key;
                    return (
                      <tr key={key}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{req.vendorBusinessName}</p>
                          <p className="text-xs text-gray-500">{req.vendorEmail}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{row.value}</p>
                          <p className="text-xs text-gray-500">{row.label}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                            Pending
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAction(req.vendorId, row.type, 'active')}
                              disabled={actioning}
                              title="Mark live"
                              className="inline-flex items-center gap-1 rounded-lg border border-green-300 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
                            >
                              <CheckCircleIcon className="h-3.5 w-3.5" /> Mark live
                            </button>
                            <button
                              onClick={() => handleAction(req.vendorId, row.type, 'failed')}
                              disabled={actioning}
                              title="Mark failed"
                              className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              <XIcon className="h-3.5 w-3.5" /> Failed
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default withAdminAuth(DomainRequests);
