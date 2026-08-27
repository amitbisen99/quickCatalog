import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import StatCard from '@/components/dashboard/StatCard';
import withAuth from '@/components/withAuth';
import { useAuth, AuthUser } from '@/context/AuthContext';
import { apiFetch } from '@/utils/api';
import { GridIcon, TagIcon, MailIcon, ChartBarIcon } from '@/components/icons';

function subscriptionLabel(user: AuthUser | null): string {
  if (!user) return '—';
  if (user.subscriptionType !== 'paid') return 'Free plan';
  if (!user.subscriptionExpiresAt) return 'Paid plan';

  const daysRemaining = Math.ceil(
    (new Date(user.subscriptionExpiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
  );
  return daysRemaining > 0 ? `Paid — ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left` : 'Paid plan expired';
}

function Dashboard() {
  const { user: contextUser } = useAuth();
  const [profileUser, setProfileUser] = useState<AuthUser | null>(null);
  const [catalogCount, setCatalogCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [enquiriesThisMonth, setEnquiriesThisMonth] = useState(0);

  useEffect(() => {
    apiFetch<{ user: AuthUser }>('/users/profile')
      .then((res) => setProfileUser(res.user))
      .catch(() => {
        // Fall back to the context's cached user below if this fails.
      });
    apiFetch<{ catalogs: unknown[] }>('/catalogs')
      .then((res) => setCatalogCount(res.catalogs.length))
      .catch(() => {
        // Leave at 0 if this fails — not worth blocking the rest of the page.
      });
    // limit=1 — the count comes from pagination.total, not the returned
    // rows, so there's no reason to fetch the vendor's whole product list
    // just to read a number off the front of it.
    apiFetch<{ pagination: { total: number } }>('/products?limit=1')
      .then((res) => setProductCount(res.pagination.total))
      .catch(() => {
        // Leave at 0 if this fails.
      });
    apiFetch<{ enquiries: { createdAt: string }[] }>('/enquiries')
      .then((res) => {
        const now = new Date();
        const count = res.enquiries.filter((e) => {
          const d = new Date(e.createdAt);
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        }).length;
        setEnquiriesThisMonth(count);
      })
      .catch(() => {
        // Leave at 0 if this fails.
      });
  }, []);

  const user = profileUser || contextUser;

  return (
    <DashboardLayout title="Dashboard">
      <h1 className="text-3xl font-bold text-gray-900">Hello, {user?.businessName || user?.email?.split('@')[0]} 👋</h1>
      <p className="mt-1.5 text-base text-gray-500">Here&apos;s an overview of your catalogs.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Views stays 0 — there's no vendor-wide (cross-catalog)
            aggregate endpoint yet, only GET /analytics/:catalogId for a
            single catalog at a time. */}
        <StatCard label="Total Catalogs" value={catalogCount} icon={GridIcon} accent="primary" />
        <StatCard label="Total Products" value={productCount} icon={TagIcon} accent="secondary" />
        <StatCard label="Enquiries" value={enquiriesThisMonth} hint="This month" icon={MailIcon} accent="green" />
        <StatCard label="Views" value={0} hint="This month" icon={ChartBarIcon} accent="gray" />
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">Subscription</p>
        <p className="mt-1 text-lg font-semibold text-gray-900">{subscriptionLabel(user)}</p>
      </div>
    </DashboardLayout>
  );
}

export default withAuth(Dashboard);
