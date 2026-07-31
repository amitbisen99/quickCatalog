import Head from 'next/head';
import { useRouter } from 'next/router';
import withAdminAuth from '@/components/withAdminAuth';
import { useAdminAuth } from '@/context/AdminAuthContext';

// Minimal placeholder proving the admin session round-trip works end to
// end. Vendor/catalog management, support tickets, subscriptions, and
// payments are deferred to later passes.
function AdminDashboard() {
  const router = useRouter();
  const { admin, logout } = useAdminAuth();

  async function handleLogout() {
    await logout();
    router.push('/admin');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Admin Dashboard | QuickCatalog</title>
      </Head>

      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="text-lg font-semibold text-primary-700">QuickCatalog Admin</span>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back{admin ? `, ${admin.email}` : ''}</h1>
        <p className="mt-2 text-sm text-gray-500">
          Vendor management, catalogs, support tickets, subscriptions, and payments will land here in upcoming
          passes.
        </p>
      </main>
    </div>
  );
}

export default withAdminAuth(AdminDashboard);
