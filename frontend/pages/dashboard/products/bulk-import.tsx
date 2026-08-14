import { ChangeEvent, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import Alert from '@/components/Alert';
import ProgressBar from '@/components/ProgressBar';
import { useSimulatedProgress } from '@/hooks/useSimulatedProgress';
import { DownloadIcon, UploadIcon } from '@/components/icons';
import { apiFetch, ApiError, API_URL } from '@/utils/api';

const MAX_EXCEL_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ZIP_SIZE = 900 * 1024 * 1024; // 900MB — matches the backend's bulkImportUpload limit

interface ImportResult {
  productsCreated: number;
  errors: { rowNumber: number; error: string }[];
  warnings: { rowNumber: number; warning: string }[];
}

function BulkImportProducts() {
  const [file, setFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const importProgress = useSimulatedProgress(importing);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setError('');
    setResult(null);
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!/\.(xlsx|xls)$/i.test(selected.name)) {
      setError('Only Excel files (.xlsx, .xls) are supported');
      return;
    }
    if (selected.size > MAX_EXCEL_SIZE) {
      setError('File is too large — the limit is 10MB');
      return;
    }
    setFile(selected);
  }

  function handleZipChange(e: ChangeEvent<HTMLInputElement>) {
    setError('');
    setResult(null);
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!/\.zip$/i.test(selected.name)) {
      setError('Product images must be a .zip file');
      return;
    }
    if (selected.size > MAX_ZIP_SIZE) {
      setError('ZIP file is too large — the limit is 900MB');
      return;
    }
    setZipFile(selected);
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (zipFile) formData.append('imagesZip', zipFile);
      const res = await apiFetch<ImportResult>('/products/bulk-import', { method: 'POST', formData });
      setResult(res);
      setFile(null);
      setZipFile(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <DashboardLayout title="Bulk Import Products">
      <Link href="/dashboard/products" className="text-sm font-medium text-gray-500 hover:text-primary-700">
        ← Back to products
      </Link>
      <h1 className="mt-1 text-3xl font-bold text-gray-900">Bulk Import Products</h1>
      <p className="mt-1 text-sm text-gray-500">
        Add many products at once by filling in our template and uploading it here. Imported products land in
        your library — link them to any catalog afterward.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">1. Download the template</h2>
          <p className="mt-1 text-sm text-gray-500">
            Fill in one row per product. Product Name and Price are required — everything else is optional. The
            template's <strong>Reference</strong> tab lists your existing category and specification names — copy
            from there to avoid typos creating duplicates.
          </p>
          <ul className="mt-3 space-y-1 text-xs text-gray-500">
            <li>
              <strong>Specifications</strong> — e.g. <code className="rounded bg-gray-100 px-1">Color: Red; Size: Large</code>
            </li>
            <li>
              <strong>Image URL</strong> — a direct link to a hosted photo
            </li>
            <li>
              <strong>Image Filename</strong> — used instead, if you upload a ZIP of photos below (e.g.{' '}
              <code className="rounded bg-gray-100 px-1">shirt1.jpg</code>)
            </li>
          </ul>
          <a
            href={`${API_URL}/products/bulk-import-sample`}
            download
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <DownloadIcon className="h-4 w-4" />
            Download Sample Template
          </a>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">2. Upload your files</h2>

          {error && (
            <div className="mt-3">
              <Alert variant="error">{error}</Alert>
            </div>
          )}

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Product sheet</label>
            <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="mt-1 w-full text-sm text-gray-600" />
            <p className="mt-1 text-xs text-gray-400">Excel files only (.xlsx, .xls), max 10MB.</p>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Product images (optional)</label>
            <input type="file" accept=".zip" onChange={handleZipChange} className="mt-1 w-full text-sm text-gray-600" />
            <p className="mt-1 text-xs text-gray-400">
              A .zip of photos, referenced by filename in the sheet's Image Filename column. Max 900MB.
            </p>
          </div>

          <button
            onClick={handleImport}
            disabled={!file || importing}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UploadIcon className="h-4 w-4" />
            {importing ? 'Importing…' : 'Import Products'}
          </button>

          {importing && (
            <div className="mt-4">
              <ProgressBar percent={importProgress} />
              <p className="mt-2 text-xs text-gray-500">
                {importProgress < 40
                  ? 'Reading your file…'
                  : importProgress < 75
                    ? 'Matching categories, specs, and images…'
                    : 'Creating your products…'}{' '}
                Larger files can take a moment — please don&apos;t close this page.
              </p>
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <Alert variant="success">
            {result.productsCreated} product{result.productsCreated === 1 ? '' : 's'} imported successfully.
          </Alert>

          {result.errors.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-amber-700">
                {result.errors.length} row{result.errors.length === 1 ? '' : 's'} skipped:
              </p>
              <ul className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    Row {e.rowNumber}: {e.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.warnings.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-600">
                {result.warnings.length} note{result.warnings.length === 1 ? '' : 's'} (product{result.warnings.length === 1 ? '' : 's'} still created):
              </p>
              <ul className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                {result.warnings.map((w, i) => (
                  <li key={i}>
                    Row {w.rowNumber}: {w.warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link
            href="/dashboard/products"
            className="mt-4 inline-block rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800"
          >
            View Products
          </Link>
        </div>
      )}
    </DashboardLayout>
  );
}

export default withAuth(BulkImportProducts);
