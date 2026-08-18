import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import Alert from '@/components/Alert';
import { ChartBarIcon } from '@/components/icons';
import { apiFetch, ApiError } from '@/utils/api';

interface Catalog {
  id: string;
  name: string;
  productsCount: number;
}

function AnalyticsCatalogList() {
  const [catalogs, setCatalogs] = useState<Catalog[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ catalogs: Catalog[] }>('/catalogs')
      .then((res) => setCatalogs(res.catalogs))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load catalogs.'));
  }, []);

  return (
    <DashboardLayout title="Analytics">
      <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
      <p className="mt-1 text-sm text-gray-500">Pick a catalog to see its views, conversion rate, and top products.</p>

      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {catalogs === null ? (
          <p className="p-6 text-sm text-gray-500">Loading…</p>
        ) : catalogs.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-gray-900">No catalogs yet</p>
            <p className="mt-1 text-sm text-gray-500">Create a catalog first to start seeing analytics for it.</p>
            <Link
              href="/dashboard/catalogs"
              className="mt-4 inline-block rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800"
            >
              Go to Catalogs
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Catalog Name</th>
                  <th className="px-4 py-3 font-medium">Products</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {catalogs.map((catalog) => (
                  <tr key={catalog.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{catalog.name}</td>
                    <td className="px-4 py-3 text-gray-600">{catalog.productsCount}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/catalogs/${catalog.id}/analytics`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <ChartBarIcon className="h-3.5 w-3.5" />
                        View Analytics
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

export default withAuth(AnalyticsCatalogList);
