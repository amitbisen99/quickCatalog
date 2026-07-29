import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import Alert from '@/components/Alert';
import { CopyIcon, DownloadIcon, PencilIcon, TrashIcon } from '@/components/icons';
import { apiFetch, ApiError } from '@/utils/api';
import { getCatalogTemplate } from '@/components/catalog-templates/registry';

interface Catalog {
  id: string;
  name: string;
  description?: string;
  slug: string;
  qrCode?: string;
  template: string;
  productsCount: number;
  createdAt: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function CatalogDetail() {
  const router = useRouter();
  const catalogId = typeof router.query.catalogId === 'string' ? router.query.catalogId : '';

  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

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
  const shareText = `Check out our catalog: ${catalog.name}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCopyForInstagram() {
    await navigator.clipboard.writeText(`${shareText} ${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadQr() {
    if (!catalog?.qrCode) return;
    const a = document.createElement('a');
    a.href = catalog.qrCode;
    a.download = `${catalog.slug}-qr.png`;
    a.click();
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
                    <a
                      href={`${API_URL}/catalogs/${catalogId}/pdf`}
                      download
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <DownloadIcon className="h-4 w-4" />
                      Download PDF
                    </a>
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

              <div className="mt-6 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <span className="flex-1 truncate text-sm text-gray-600">{url}</span>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  <CopyIcon className="h-3.5 w-3.5" />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-sm font-medium text-primary-700 hover:text-primary-800"
              >
                View public page →
              </a>

              <div className="mt-6">
                <p className="text-sm font-medium text-gray-700">Share</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Facebook
                  </a>
                  <button
                    onClick={handleCopyForInstagram}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {copied ? 'Copied for Instagram!' : 'Instagram (copy link)'}
                  </button>
                  <a
                    href={`sms:?body=${encodeURIComponent(`${shareText} ${url}`)}`}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    SMS
                  </a>
                  <a
                    href={`mailto:?subject=${encodeURIComponent(catalog.name)}&body=${encodeURIComponent(`${shareText} ${url}`)}`}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Email
                  </a>
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
    </DashboardLayout>
  );
}

export default withAuth(CatalogDetail);
