import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import withAdminAuth from '@/components/withAdminAuth';
import Alert from '@/components/Alert';
import { TrashIcon } from '@/components/icons';
import { apiFetch, ApiError } from '@/utils/api';

interface Vendor {
  id: string;
  email: string;
  mobileNo: string;
  businessName?: string;
  businessType?: string;
  industry?: string;
  logo?: string;
  currency?: string;
  subscriptionType: string;
  subscriptionExpiresAt?: string;
  status: string;
  createdAt: string;
}

const STATUS_BADGE: Record<string, string> = {
  verified: 'bg-green-100 text-green-700',
  inactive: 'bg-red-100 text-red-700',
  unverified: 'bg-gray-100 text-gray-600',
};

const STATUS_LABEL: Record<string, string> = {
  verified: 'Active',
  inactive: 'Inactive',
  unverified: 'Unverified',
};

function VendorDetail() {
  const router = useRouter();
  const userId = typeof router.query.userId === 'string' ? router.query.userId : '';

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!userId) return;
    apiFetch<{ user: Vendor }>(`/admin/users/${userId}`)
      .then((res) => setVendor(res.user))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load this vendor.'));
  }, [userId]);

  if (!vendor) {
    return (
      <AdminLayout title="Vendor">
        {error ? <Alert variant="error">{error}</Alert> : <p className="text-sm text-gray-500">Loading…</p>}
      </AdminLayout>
    );
  }

  const isActive = vendor.status === 'verified';

  async function handleToggleStatus() {
    if (!vendor) return;
    const nextStatus = isActive ? 'inactive' : 'verified';
    const verb = isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${verb} "${vendor.businessName || vendor.email}"?`)) return;

    setUpdatingStatus(true);
    setError('');
    try {
      const result = await apiFetch<{ user: Vendor }>(`/admin/users/${userId}/status`, {
        method: 'PUT',
        body: { status: nextStatus },
      });
      setVendor(result.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update this vendor.');
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleDelete() {
    if (!vendor) return;
    const confirmed = window.confirm(
      `Permanently delete "${vendor.businessName || vendor.email}"? This also deletes all of their catalogs, products, and enquiries. This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setError('');
    try {
      await apiFetch(`/admin/users/${userId}`, { method: 'DELETE' });
      router.push('/admin/vendors');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete this vendor.');
      setDeleting(false);
    }
  }

  return (
    <AdminLayout title="Vendor">
      <Link href="/admin/vendors" className="text-sm font-medium text-gray-500 hover:text-primary-700">
        ← Back to vendors
      </Link>

      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {vendor.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vendor.logo} alt={vendor.businessName} className="h-14 w-14 rounded-xl object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-100 text-lg font-bold text-primary-700">
                {(vendor.businessName || vendor.email).slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{vendor.businessName || 'Unnamed Business'}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[vendor.status]}`}>
                  {STATUS_LABEL[vendor.status]}
                </span>
                <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold uppercase text-primary-700">
                  {vendor.subscriptionType}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleToggleStatus}
              disabled={updatingStatus}
              className={`rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${
                isActive
                  ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  : 'bg-primary-700 text-white hover:bg-primary-800'
              }`}
            >
              {updatingStatus ? 'Saving…' : isActive ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <TrashIcon className="h-4 w-4" />
              {deleting ? 'Deleting…' : 'Delete Vendor'}
            </button>
          </div>
        </div>

        <dl className="mt-8 grid grid-cols-1 gap-6 border-t border-gray-100 pt-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Email</dt>
            <dd className="mt-1 text-sm text-gray-900">{vendor.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Mobile</dt>
            <dd className="mt-1 text-sm text-gray-900">{vendor.mobileNo}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Business Type</dt>
            <dd className="mt-1 text-sm text-gray-900">{vendor.businessType || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Industry</dt>
            <dd className="mt-1 text-sm text-gray-900">{vendor.industry || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Currency</dt>
            <dd className="mt-1 text-sm text-gray-900">{vendor.currency || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Plan Expires</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {vendor.subscriptionExpiresAt ? new Date(vendor.subscriptionExpiresAt).toLocaleDateString() : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Joined</dt>
            <dd className="mt-1 text-sm text-gray-900">{new Date(vendor.createdAt).toLocaleDateString()}</dd>
          </div>
        </dl>
      </div>
    </AdminLayout>
  );
}

export default withAdminAuth(VendorDetail);
