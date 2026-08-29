import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import Alert from '@/components/Alert';
import CreateCatalogModal from '@/components/dashboard/CreateCatalogModal';
import ShareCatalogModal from '@/components/dashboard/ShareCatalogModal';
import UpgradePlanModal from '@/components/dashboard/UpgradePlanModal';
import { CopyIcon, DownloadIcon, EyeIcon, PencilIcon, PlusIcon, ShareIcon, SpinnerIcon, TrashIcon } from '@/components/icons';
import { apiFetch, ApiError } from '@/utils/api';
import { downloadFile } from '@/utils/downloadFile';
import { getCatalogPublicUrl } from '@/utils/catalogUrl';
import { useAuth } from '@/context/AuthContext';

interface Catalog {
  id: string;
  name: string;
  description?: string;
  slug: string;
  qrCode?: string;
  productsCount: number;
  createdAt: string;
}

function Catalogs() {
  const router = useRouter();
  const { user } = useAuth();

  function publicUrl(slug: string) {
    return getCatalogPublicUrl(slug, user);
  }
  const [catalogs, setCatalogs] = useState<Catalog[] | null>(null);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState('');
  const [sharingCatalog, setSharingCatalog] = useState<Catalog | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState('');

  function loadCatalogs() {
    apiFetch<{ catalogs: Catalog[] }>('/catalogs')
      .then((res) => setCatalogs(res.catalogs))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load catalogs.'));
  }

  useEffect(loadCatalogs, []);

  function handleCreated(catalog: Catalog) {
    setModalOpen(false);
    router.push(`/dashboard/catalogs/${catalog.id}`);
  }

  async function handleCopy(slug: string) {
    await navigator.clipboard.writeText(publicUrl(slug));
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(''), 2000);
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await apiFetch(`/catalogs/${id}`, { method: 'DELETE' });
      setCatalogs((prev) => prev?.filter((c) => c.id !== id) || null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete catalog.');
    }
  }

  async function handleDownloadPdf(id: string, name: string) {
    setDownloadingId(id);
    try {
      await downloadFile(`/catalogs/${id}/pdf`, `${name}.pdf`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not download the PDF. Please try again.');
    } finally {
      setDownloadingId('');
    }
  }

  return (
    <DashboardLayout title="Catalogs">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Catalogs</h1>
          <p className="mt-1.5 hidden text-base text-gray-500 sm:block">Create and manage your product catalogs.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-700 px-3 py-2 text-sm font-medium text-white hover:bg-primary-800 sm:px-4 sm:py-2.5"
        >
          <PlusIcon className="h-4 w-4 sm:hidden" />
          <span className="sm:hidden">Catalog</span>
          <span className="hidden sm:inline">Create New Catalog</span>
        </button>
      </div>

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
            <p className="mt-1 text-sm text-gray-500">Create your first catalog to get started.</p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800"
            >
              Create Catalog
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Catalog Name</th>
                  <th className="px-4 py-3 font-medium">Products</th>
                  <th className="px-4 py-3 font-medium">Link</th>
                  <th className="px-4 py-3 font-medium">QR</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {catalogs.map((catalog) => (
                  <tr key={catalog.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/catalogs/${catalog.id}`}
                        className="font-medium text-gray-900 hover:text-primary-700"
                      >
                        {catalog.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{catalog.productsCount}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleCopy(catalog.slug)}
                        className="inline-flex items-center gap-1.5 text-gray-500 hover:text-primary-700"
                        title={publicUrl(catalog.slug)}
                      >
                        <CopyIcon className="h-4 w-4" />
                        {copiedSlug === catalog.slug ? 'Copied!' : 'Copy link'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {catalog.qrCode && (
                        <div className="group relative inline-block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={catalog.qrCode} alt="QR code" className="h-8 w-8 cursor-pointer rounded" />
                          <div className="pointer-events-none absolute left-1/2 top-full z-10 hidden -translate-x-1/2 pt-2 group-hover:block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={catalog.qrCode}
                              alt="QR code preview"
                              className="h-40 w-40 rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
                            />
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-4">
                        <a
                          href={publicUrl(catalog.slug)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-400 hover:text-primary-700"
                          title="Preview"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </a>
                        <button
                          onClick={() => setSharingCatalog(catalog)}
                          className="text-gray-400 hover:text-primary-700"
                          title="Share"
                        >
                          <ShareIcon className="h-5 w-5" />
                        </button>
                        <Link
                          href={`/dashboard/catalogs/${catalog.id}`}
                          className="text-gray-400 hover:text-primary-700"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </Link>
                        <button
                          onClick={() => handleDownloadPdf(catalog.id, catalog.name)}
                          disabled={downloadingId === catalog.id}
                          className="text-gray-400 hover:text-primary-700 disabled:opacity-50"
                          title="Download PDF"
                        >
                          {downloadingId === catalog.id ? (
                            <SpinnerIcon className="h-5 w-5 animate-spin" />
                          ) : (
                            <DownloadIcon className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(catalog.id, catalog.name)}
                          className="text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateCatalogModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
        onPlanLimitHit={() => setUpgradeModalOpen(true)}
      />
      <ShareCatalogModal catalog={sharingCatalog} onClose={() => setSharingCatalog(null)} />
      <UpgradePlanModal isOpen={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} reason="catalog" />
    </DashboardLayout>
  );
}

export default withAuth(Catalogs);
