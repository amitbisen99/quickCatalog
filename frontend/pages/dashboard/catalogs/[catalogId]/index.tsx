import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import Alert from '@/components/Alert';
import ShareOptions from '@/components/dashboard/ShareOptions';
import UpgradePlanModal from '@/components/dashboard/UpgradePlanModal';
import {
  ChartBarIcon,
  CheckCircleIcon,
  CopyIcon,
  DownloadIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  ShareIcon,
  SpinnerIcon,
  TrashIcon,
} from '@/components/icons';
import { apiFetch, ApiError } from '@/utils/api';
import { downloadFile } from '@/utils/downloadFile';
import { getCatalogTemplate } from '@/components/catalog-templates/registry';
import { downloadQrWithLabel } from '@/utils/downloadQrWithLabel';
import { useAuth } from '@/context/AuthContext';
import { isFreePlan } from '@/utils/planLimit';

type DomainStatus = 'pending' | 'active' | 'failed';

interface Catalog {
  id: string;
  name: string;
  description?: string;
  slug: string;
  qrCode?: string;
  template: string;
  subdomain?: string;
  subdomainStatus?: DomainStatus;
  customDomain?: string;
  customDomainStatus?: DomainStatus;
  productsCount: number;
  createdAt: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010';
// The bare domain the app is deployed on — used to build the preview of
// what a requested subdomain will look like (`{value}.{APP_BASE_DOMAIN}`).
// Falls back to parsing it out of APP_URL so this doesn't need its own
// separate env var kept in sync with NEXT_PUBLIC_APP_URL.
const APP_BASE_DOMAIN = (() => {
  try {
    return new URL(APP_URL).hostname;
  } catch {
    return 'instantcatalog.app';
  }
})();

function CatalogDetail() {
  const router = useRouter();
  const { user } = useAuth();
  const catalogId = typeof router.query.catalogId === 'string' ? router.query.catalogId : '';

  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const [subdomainInput, setSubdomainInput] = useState('');
  const [savingSubdomain, setSavingSubdomain] = useState(false);
  const [subdomainError, setSubdomainError] = useState('');
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [savingCustomDomain, setSavingCustomDomain] = useState(false);
  const [customDomainError, setCustomDomainError] = useState('');
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  useEffect(() => {
    if (!catalogId) return;
    apiFetch<{ catalog: Catalog }>(`/catalogs/${catalogId}`)
      .then((res) => {
        setCatalog(res.catalog);
        setName(res.catalog.name);
        setDescription(res.catalog.description || '');
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load catalog.'));
  }, [catalogId]);

  if (!catalog) {
    return (
      <DashboardLayout title="Catalog">
        {error ? <Alert variant="error">{error}</Alert> : <p className="text-sm text-gray-500">Loading…</p>}
      </DashboardLayout>
    );
  }

  const url = `${APP_URL}/public/${catalog.slug}`;
  const businessName = user?.businessName || 'Our Business';
  // Business-formal share copy — reads naturally as a WhatsApp/SMS/email
  // message rather than an ad. Facebook's sharer doesn't take custom
  // text (it reads the page's own Open Graph tags instead), so this is
  // only used by the channels that actually accept a message body.
  const shareText = `${businessName} — Product Catalog\nExplore our full range: ${catalog.name}`;
  const shareMessage = `${shareText}\n${url}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadQr() {
    if (!catalog?.qrCode) return;
    // The on-page QR stays exactly as generated — this only affects the
    // downloaded file, which gets the business name + a short
    // call-to-action composed onto it so it's ready to print/share as-is.
    downloadQrWithLabel(catalog.qrCode, businessName, `${catalog.slug}-qr.png`);
  }

  async function handleDownloadPdf() {
    if (!catalog) return;
    setDownloadingPdf(true);
    try {
      await downloadFile(`/catalogs/${catalogId}/pdf`, `${catalog.name}.pdf`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not download the PDF. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaveError('');
    setSaving(true);
    try {
      const result = await apiFetch<{ catalog: Catalog }>(`/catalogs/${catalogId}`, {
        method: 'PUT',
        body: { name, description },
      });
      setCatalog(result.catalog);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${catalog?.name}"? This cannot be undone.`)) return;
    try {
      await apiFetch(`/catalogs/${catalogId}`, { method: 'DELETE' });
      router.push('/dashboard/catalogs');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete catalog.');
    }
  }

  async function handleSetSubdomain(e: FormEvent) {
    e.preventDefault();
    setSubdomainError('');
    setSavingSubdomain(true);
    try {
      const result = await apiFetch<{ catalog: Catalog }>(`/catalogs/${catalogId}/subdomain`, {
        method: 'PUT',
        body: { subdomain: subdomainInput },
      });
      setCatalog(result.catalog);
      setSubdomainInput('');
    } catch (err) {
      setSubdomainError(err instanceof ApiError ? err.message : 'Could not request that subdomain. Please try again.');
    } finally {
      setSavingSubdomain(false);
    }
  }

  async function handleRemoveSubdomain() {
    if (!window.confirm('Remove this subdomain?')) return;
    try {
      const result = await apiFetch<{ catalog: Catalog }>(`/catalogs/${catalogId}/subdomain`, { method: 'DELETE' });
      setCatalog(result.catalog);
    } catch (err) {
      setSubdomainError(err instanceof ApiError ? err.message : 'Could not remove the subdomain.');
    }
  }

  async function handleSetCustomDomain(e: FormEvent) {
    e.preventDefault();
    if (isFreePlan(user)) {
      setUpgradeModalOpen(true);
      return;
    }
    setCustomDomainError('');
    setSavingCustomDomain(true);
    try {
      const result = await apiFetch<{ catalog: Catalog }>(`/catalogs/${catalogId}/custom-domain`, {
        method: 'PUT',
        body: { customDomain: customDomainInput },
      });
      setCatalog(result.catalog);
      setCustomDomainInput('');
    } catch (err) {
      setCustomDomainError(err instanceof ApiError ? err.message : 'Could not connect that domain. Please try again.');
    } finally {
      setSavingCustomDomain(false);
    }
  }

  async function handleRemoveCustomDomain() {
    if (!window.confirm('Disconnect this domain?')) return;
    try {
      const result = await apiFetch<{ catalog: Catalog }>(`/catalogs/${catalogId}/custom-domain`, { method: 'DELETE' });
      setCatalog(result.catalog);
    } catch (err) {
      setCustomDomainError(err instanceof ApiError ? err.message : 'Could not disconnect the domain.');
    }
  }

  return (
    <DashboardLayout title={catalog.name}>
      <Link href="/dashboard/catalogs" className="text-sm font-medium text-gray-500 hover:text-primary-700">
        ← Back to catalogs
      </Link>

      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              {saveError && <Alert variant="error">{saveError}</Alert>}
              <div>
                <label className="block text-sm font-medium text-gray-700">Catalog Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={200}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                />
                <p className="mt-1 text-right text-xs text-gray-400">{description.length}/200</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{catalog.name}</h1>
                  {catalog.description && <p className="mt-1 text-sm text-gray-600">{catalog.description}</p>}
                  <p className="mt-2 text-sm text-gray-500">{catalog.productsCount} products</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Link
                      href={`/dashboard/catalogs/${catalogId}/products`}
                      className="inline-block rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800"
                    >
                      Manage Products
                    </Link>
                    <button
                      onClick={handleDownloadPdf}
                      disabled={downloadingPdf}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {downloadingPdf ? (
                        <SpinnerIcon className="h-4 w-4 animate-spin" />
                      ) : (
                        <DownloadIcon className="h-4 w-4" />
                      )}
                      {downloadingPdf ? 'Downloading…' : 'Download PDF'}
                    </button>
                    <Link
                      href={`/dashboard/catalogs/${catalogId}/analytics`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <ChartBarIcon className="h-4 w-4" />
                      Analytics
                    </Link>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-primary-700" title="Edit">
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button onClick={handleDelete} className="text-gray-400 hover:text-red-600" title="Delete">
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Highlighted — sharing is the whole point of a public
                  catalog, so this shouldn't read as just another
                  secondary section on the page. */}
              <div className="mt-6 rounded-2xl border-2 border-primary-200 bg-primary-50 p-4 sm:p-5">
                <div className="flex items-center gap-2">
                  <ShareIcon className="h-5 w-5 text-primary-700" />
                  <p className="text-base font-semibold text-gray-900">Share your catalog</p>
                </div>
                <p className="mt-1 text-sm text-gray-600">Get this in front of customers — share the link below.</p>

                <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary-200 bg-white px-3 py-2">
                  <span className="flex-1 truncate text-sm text-gray-600">{url}</span>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-100"
                  >
                    <CopyIcon className="h-3.5 w-3.5" />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm font-medium text-primary-700 hover:text-primary-800"
                >
                  View public page →
                </a>

                <div className="mt-5">
                  <ShareOptions url={url} message={shareMessage} subject={catalog.name} />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-700">QR Code</p>
          {catalog.qrCode && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={catalog.qrCode} alt="Catalog QR code" className="mt-3 w-full max-w-[220px] rounded-lg" />
              <button
                onClick={handleDownloadQr}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <DownloadIcon className="h-4 w-4" />
                Download
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium text-gray-700">Catalog Template</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{getCatalogTemplate(catalog.template).label}</p>
          <p className="mt-1 text-xs text-gray-500">{getCatalogTemplate(catalog.template).description}</p>
        </div>
        <Link
          href="/dashboard/templates"
          className="shrink-0 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Change template
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-base font-semibold text-gray-900">White-label domain</p>
        <p className="mt-1 text-sm text-gray-500">
          Show this catalog under your own address instead of our shared link.
        </p>

        <div className="mt-5 border-t border-gray-100 pt-5">
          <p className="text-sm font-medium text-gray-700">Branded subdomain</p>
          {catalog.subdomain ? (
            <div className="mt-2 flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {catalog.subdomain}.{APP_BASE_DOMAIN}
                </p>
                {catalog.subdomainStatus === 'active' ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-green-700">
                    <CheckCircleIcon className="h-3.5 w-3.5" /> Live
                  </p>
                ) : catalog.subdomainStatus === 'failed' ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                    <ExclamationTriangleIcon className="h-3.5 w-3.5" /> Setup failed — contact support
                  </p>
                ) : (
                  <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                    <ExclamationTriangleIcon className="h-3.5 w-3.5" /> Pending — we&apos;re setting this up
                  </p>
                )}
              </div>
              <button
                onClick={handleRemoveSubdomain}
                className="shrink-0 text-xs font-medium text-gray-400 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          ) : (
            <form onSubmit={handleSetSubdomain} className="mt-2">
              <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center rounded-lg border border-gray-300 focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600">
                  <input
                    value={subdomainInput}
                    onChange={(e) => setSubdomainInput(e.target.value)}
                    placeholder="yourbrand"
                    className="w-full rounded-l-lg px-3 py-2 text-sm focus:outline-none"
                  />
                  <span className="shrink-0 pr-3 text-sm text-gray-400">.{APP_BASE_DOMAIN}</span>
                </div>
                <button
                  type="submit"
                  disabled={savingSubdomain || !subdomainInput.trim()}
                  className="shrink-0 rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50"
                >
                  {savingSubdomain ? 'Requesting…' : 'Request'}
                </button>
              </div>
              {subdomainError && <p className="mt-2 text-xs text-red-600">{subdomainError}</p>}
            </form>
          )}
        </div>

        <div className="mt-5 border-t border-gray-100 pt-5">
          <p className="text-sm font-medium text-gray-700">Custom domain</p>
          {isFreePlan(user) && !catalog.customDomain ? (
            <button
              onClick={() => setUpgradeModalOpen(true)}
              className="mt-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Upgrade to connect your own domain
            </button>
          ) : catalog.customDomain ? (
            <div className="mt-2 flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{catalog.customDomain}</p>
                {catalog.customDomainStatus === 'active' ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-green-700">
                    <CheckCircleIcon className="h-3.5 w-3.5" /> Live
                  </p>
                ) : catalog.customDomainStatus === 'failed' ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                    <ExclamationTriangleIcon className="h-3.5 w-3.5" /> Setup failed — contact support
                  </p>
                ) : (
                  <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                    <ExclamationTriangleIcon className="h-3.5 w-3.5" /> Pending — we&apos;re setting this up
                  </p>
                )}
              </div>
              <button
                onClick={handleRemoveCustomDomain}
                className="shrink-0 text-xs font-medium text-gray-400 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          ) : (
            <form onSubmit={handleSetCustomDomain} className="mt-2">
              <div className="flex items-center gap-2">
                <input
                  value={customDomainInput}
                  onChange={(e) => setCustomDomainInput(e.target.value)}
                  placeholder="catalog.yourbrand.com"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                />
                <button
                  type="submit"
                  disabled={savingCustomDomain || !customDomainInput.trim()}
                  className="shrink-0 rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50"
                >
                  {savingCustomDomain ? 'Connecting…' : 'Connect'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Point a CNAME record for this domain at our hosting — we&apos;ll confirm once it&apos;s set up.
              </p>
              {customDomainError && <p className="mt-2 text-xs text-red-600">{customDomainError}</p>}
            </form>
          )}
        </div>
      </div>

      <UpgradePlanModal isOpen={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} reason="domain" />
    </DashboardLayout>
  );
}

export default withAuth(CatalogDetail);
