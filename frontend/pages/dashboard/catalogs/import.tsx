import { ChangeEvent, FormEvent, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import Alert from '@/components/Alert';
import { apiFetch, ApiError } from '@/utils/api';
import { autoMapHeaders } from '@/utils/fuzzyMapHeaders';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: 'productName', label: 'Product Name', required: true },
  { key: 'price', label: 'Price', required: true },
  { key: 'description', label: 'Description' },
  { key: 'category', label: 'Category' },
  { key: 'unit', label: 'Unit' },
  { key: 'imageUrl', label: 'Image URLs' },
  { key: 'videoUrl', label: 'Video URL' },
];

type Step = 'upload' | 'mapping' | 'details' | 'review';

interface ParseResult {
  headers: string[];
  dataPreview: Record<string, unknown>[];
  totalRows: number;
}

interface CreateResult {
  catalog: { id: string; name: string };
  productsCreated: number;
  errors: { rowNumber: number; error: string }[];
}

function Import() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('upload');

  const [file, setFile] = useState<File | null>(null);
  const [parseError, setParseError] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParseResult | null>(null);

  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});

  const [catalogName, setCatalogName] = useState('');
  const [catalogDescription, setCatalogDescription] = useState('');

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [result, setResult] = useState<CreateResult | null>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    setParseError('');
    if (!selected) return;

    if (!/\.(xlsx|xls)$/i.test(selected.name)) {
      setParseError('Only Excel files (.xlsx, .xls) are supported');
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setParseError('File is too large — the limit is 10MB');
      return;
    }
    setFile(selected);
  }

  async function handleParse() {
    if (!file) return;
    setParsing(true);
    setParseError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiFetch<ParseResult>('/upload/parse-catalog', { method: 'POST', formData });
      setParsed(res);
      setFieldMappings(autoMapHeaders(res.headers));
      setStep('mapping');
    } catch (err) {
      setParseError(err instanceof ApiError ? err.message : 'Could not parse this file. Please try again.');
    } finally {
      setParsing(false);
    }
  }

  function handleMappingChange(field: string, header: string) {
    setFieldMappings((prev) => {
      const next = { ...prev };
      if (header) next[field] = header;
      else delete next[field];
      return next;
    });
  }

  const canProceedFromMapping = Boolean(fieldMappings.productName && fieldMappings.price);

  function handleDetailsSubmit(e: FormEvent) {
    e.preventDefault();
    if (!catalogName.trim()) return;
    setStep('review');
  }

  async function handleConfirmCreate() {
    if (!file) return;
    setCreating(true);
    setCreateError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('catalogName', catalogName);
      formData.append('catalogDescription', catalogDescription);
      formData.append('fieldMappings', JSON.stringify(fieldMappings));

      const res = await apiFetch<CreateResult>('/catalogs/create-from-file', { method: 'POST', formData });
      setResult(res);
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  const previewRows = parsed?.dataPreview.slice(0, 5) || [];

  return (
    <DashboardLayout title="Import Catalog">
      <Link href="/dashboard/catalogs" className="text-sm font-medium text-gray-500 hover:text-primary-700">
        ← Back to catalogs
      </Link>
      <h1 className="mt-2 text-3xl font-bold text-gray-900">Import from Excel</h1>

      {/* Step indicator */}
      <div className="mt-4 flex items-center gap-2 text-xs font-medium text-gray-400">
        {(['upload', 'mapping', 'details', 'review'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <span>→</span>}
            <span className={step === s ? 'text-primary-700' : ''}>{i + 1}. {s[0].toUpperCase() + s.slice(1)}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {step === 'upload' && (
          <div className="space-y-4">
            {parseError && <Alert variant="error">{parseError}</Alert>}
            <div>
              <label className="block text-sm font-medium text-gray-700">Excel file (.xlsx, .xls)</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="mt-1 w-full text-sm text-gray-600"
              />
              <p className="mt-1 text-xs text-gray-400">Max 10MB. First row must be column headers.</p>
            </div>
            <button
              onClick={handleParse}
              disabled={!file || parsing}
              className="rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {parsing ? 'Parsing…' : 'Parse File'}
            </button>
          </div>
        )}

        {step === 'mapping' && parsed && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">{parsed.totalRows} rows detected. Map your columns below.</p>
              <button
                onClick={() => setFieldMappings(autoMapHeaders(parsed.headers))}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Auto-map
              </button>
            </div>

            <div className="space-y-3">
              {FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-4">
                  <label className="w-40 shrink-0 text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-500"> *</span>}
                  </label>
                  <select
                    value={fieldMappings[field.key] || ''}
                    onChange={(e) => handleMappingChange(field.key, e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  >
                    <option value="">— Not mapped —</option>
                    {parsed.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {previewRows.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      {parsed.headers.map((h) => (
                        <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewRows.map((row, i) => (
                      <tr key={i}>
                        {parsed.headers.map((h) => (
                          <td key={h} className="whitespace-nowrap px-3 py-2 text-gray-600">
                            {String(row[h] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('details')}
                disabled={!canProceedFromMapping}
                className="rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Next
              </button>
              <button
                onClick={() => setStep('upload')}
                className="text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                ← Back
              </button>
            </div>
            {!canProceedFromMapping && (
              <p className="text-xs text-amber-600">Product Name and Price must be mapped to continue.</p>
            )}
          </div>
        )}

        {step === 'details' && (
          <form onSubmit={handleDetailsSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Catalog Name</label>
              <input
                value={catalogName}
                onChange={(e) => setCatalogName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                placeholder="Summer Collection 2026"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={catalogDescription}
                onChange={(e) => setCatalogDescription(e.target.value)}
                rows={3}
                maxLength={200}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
              />
              <p className="mt-1 text-right text-xs text-gray-400">{catalogDescription.length}/200</p>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!catalogName.trim()}
                className="rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Next
              </button>
              <button
                type="button"
                onClick={() => setStep('mapping')}
                className="text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                ← Back
              </button>
            </div>
          </form>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            {!result ? (
              <>
                <p className="text-sm text-gray-600">
                  Ready to create <strong>{catalogName}</strong> from {parsed?.totalRows} row
                  {parsed?.totalRows === 1 ? '' : 's'}.
                </p>

                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="px-3 py-2 font-medium">Product Name</th>
                        <th className="px-3 py-2 font-medium">Price</th>
                        <th className="px-3 py-2 font-medium">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {previewRows.map((row, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-gray-600">
                            {String(row[fieldMappings.productName] ?? '')}
                          </td>
                          <td className="px-3 py-2 text-gray-600">{String(row[fieldMappings.price] ?? '')}</td>
                          <td className="px-3 py-2 text-gray-600">
                            {fieldMappings.category ? String(row[fieldMappings.category] ?? '') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {createError && <Alert variant="error">{createError}</Alert>}

                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmCreate}
                    disabled={creating}
                    className="rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creating ? 'Creating…' : 'Confirm & Create'}
                  </button>
                  <button
                    onClick={() => setStep('details')}
                    className="text-sm font-medium text-gray-500 hover:text-gray-700"
                  >
                    ← Back
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <Alert variant="success">
                  Catalog created with {result.productsCreated} product{result.productsCreated === 1 ? '' : 's'}.
                </Alert>

                {result.errors.length > 0 && (
                  <div>
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

                <button
                  onClick={() => router.push(`/dashboard/catalogs/${result.catalog.id}`)}
                  className="rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800"
                >
                  View Catalog
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default withAuth(Import);
