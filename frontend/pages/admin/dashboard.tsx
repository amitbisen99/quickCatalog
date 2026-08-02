import AdminLayout from '@/components/AdminLayout';
import withAdminAuth from '@/components/withAdminAuth';
import { useAdminAuth } from '@/context/AdminAuthContext';

// Vendor management is live (see /admin/vendors). Catalogs, support
// tickets, subscriptions, and payments are deferred to later passes.
function AdminDashboard() {
  const { admin } = useAdminAuth();

  return (
    <AdminLayout title="Dashboard">
      <h1 className="text-2xl font-bold text-gray-900">Welcome back{admin ? `, ${admin.email}` : ''}</h1>
      <p className="mt-2 text-sm text-gray-500">
        Catalogs, support tickets, subscriptions, and payments will land here in upcoming passes.
      </p>
    </AdminLayout>
  );
}

export default withAdminAuth(AdminDashboard);
