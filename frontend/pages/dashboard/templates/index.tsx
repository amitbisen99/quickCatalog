import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import Modal from '@/components/Modal';
import Alert from '@/components/Alert';
import { CATALOG_TEMPLATES, CatalogTemplateOption } from '@/components/catalog-templates/registry';
import { apiFetch, ApiError } from '@/utils/api';

interface CatalogSummary {
  id: string;
  name: string;
  template: string;
}

function Templates() {
  const [catalogs, setCatalogs] = useState<CatalogSummary[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [applyTarget, setApplyTarget] = useState<CatalogTemplateOption | null>(null);
  const [applyingId, setApplyingId] = useState('');
  const [applyError, setApplyError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    apiFetch<{ catalogs: CatalogSummary[] }>('/catalogs')
      .then((res) => setCatalogs(res.catalogs))
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Could not load your catalogs.'));
  }, []);

  function openApplyModal(option: CatalogTemplateOption) {
    setApplyError('');
    setApplyTarget(option);
  }

  function closeApplyModal() {
    setApplyTarget(null);
    setApplyError('');
  }

  async function applyToCatalog(catalogId: string) {
    if (!applyTarget) return;
    setApplyError('');
    setApplyingId(catalogId);
    try {
      await apiFetch(`/catalogs/${catalogId}`, { method: 'PUT', body: { template: applyTarget.id } });
      setCatalogs((prev) => prev?.map((c) => (c.id === catalogId ? { ...c, template: applyTarget.id } : c)) || null);
      setSuccessMessage(`"${applyTarget.label}" is now applied.`);
      setApplyTarget(null);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setApplyError(err instanceof ApiError ? err.message : 'Could not apply the template. Please try again.');
    } finally {
      setApplyingId('');
    }
  }

  return (
    <DashboardLayout title="Templates">
      <h1 className="text-3xl font-bold text-gray-900">Templates</h1>
      <p className="mt-1.5 text-base text-gray-500">
        Choose how your public catalog pages look to visitors. Pick a template below, then choose which catalog to apply it
        to.
      </p>

      {loadError && (
        <div className="mt-4">
          <Alert variant="error">{loadError}</Alert>
        </div>
      )}
      {successMessage && (
        <div className="mt-4">
          <Alert variant="success">{successMessage}</Alert>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {CATALOG_TEMPLATES.map((option) => {
          const usedByCount = catalogs?.filter((c) => c.template === option.id).length || 0;
          return (
            <div key={option.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="h-32 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950" />
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-900">{option.label}</h2>
                  {usedByCount > 0 && (
                    <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-700">
                      Used by {usedByCount}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm text-gray-500">{option.description}</p>
                <button
                  onClick={() => openApplyModal(option)}
                  className="mt-4 w-full rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800"
                >
                  Apply to a catalog
                </button>
              </div>
            </div>
          );
        })}

        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm font-medium text-gray-500">More templates</p>
          <p className="mt-1 text-xs text-gray-400">Coming soon</p>
        </div>
      </div>

      <Modal isOpen={!!applyTarget} onClose={closeApplyModal} title={`Apply "${applyTarget?.label}"`}>
        <p className="text-sm text-gray-500">Choose which catalog should use this template.</p>

        {applyError && (
          <div className="mt-3">
            <Alert variant="error">{applyError}</Alert>
          </div>
        )}

        <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
          {catalogs === null ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : catalogs.length === 0 ? (
            <p className="text-sm text-gray-500">You don&apos;t have any catalogs yet.</p>
          ) : (
            catalogs.map((catalog) => {
              const isCurrent = catalog.template === applyTarget?.id;
              return (
                <button
                  key={catalog.id}
                  onClick={() => applyToCatalog(catalog.id)}
                  disabled={isCurrent || applyingId === catalog.id}
                  className={`flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-left text-sm transition-colors ${
                    isCurrent
                      ? 'cursor-default border-primary-200 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-primary-50'
                  }`}
                >
                  <span className="font-medium">{catalog.name}</span>
                  <span className="text-xs">
                    {isCurrent ? 'Currently applied' : applyingId === catalog.id ? 'Applying…' : 'Apply'}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </Modal>
    </DashboardLayout>
  );
}

export default withAuth(Templates);
