import { ChangeEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import Alert from '@/components/Alert';
import UpgradePlanModal from '@/components/dashboard/UpgradePlanModal';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  UploadIcon,
  GridIcon,
  BoxIcon,
  DownloadIcon,
  SpinnerIcon,
} from '@/components/icons';
import ProgressBar from '@/components/ProgressBar';
import { useSimulatedProgress } from '@/hooks/useSimulatedProgress';
import { apiFetch, ApiError, API_URL } from '@/utils/api';
import { autoMapHeaders } from '@/utils/fuzzyMapHeaders';
import { useAuth } from '@/context/AuthContext';
import { isFreePlan, FREE_PRODUCT_LIMIT } from '@/utils/planLimit';

// Same guided step flow as the catalog-from-file wizard
// (frontend/pages/dashboard/catalogs/create.tsx: Catalog → Upload →
// Preview → Plan/Done) minus its first "Catalog Details" step — there's
// no catalog here, imported products land straight in the vendor's
// library. Same API calls (/upload/parse-catalog, fuzzy header mapping,
// a Preview before anything's created) and the same free-tier plan-limit
// handling, just re-skinned for "add to my library" instead of
// "publish a catalog".

const MAX_EXCEL_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ZIP_SIZE = 900 * 1024 * 1024; // 900MB — matches the backend's bulkImportUpload limit

type WizardStep = 1 | 2 | 3;

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 1, label: 'Upload' },
  { id: 2, label: 'Preview' },
  { id: 3, label: 'Done' },
];

const MAPPABLE_FIELD_LABELS: Record<string, string> = {
  productName: 'Product Name',
  sku: 'SKU',
  price: 'Price',
  description: 'Description',
  category: 'Category',
  unit: 'Unit',
  minimumOrderQuantity: 'Minimum Order Quantity',
  specifications: 'Specifications',
  taxPercent: 'Tax %',
  imageFilename: 'Image Filename',
  imageUrl: 'Image URL',
  videoUrl: 'Video URL',
};

interface ParseResult {
  headers: string[];
  dataPreview: Record<string, unknown>[];
  totalRows: number;
}

interface ImportResult {
  productsCreated: number;
  errors: { rowNumber: number; error: string }[];
  warnings: { rowNumber: number; warning: string }[];
  planLimit: { limit: number; totalValidRows: number; imported: number } | null;
}

function StepIndicator({ current }: { current: WizardStep }) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="sm:hidden">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
          <span>
            Step {current} of {STEPS.length}
          </span>
          <span className="text-gray-900">{STEPS[current - 1].label}</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-primary-700 transition-all"
            style={{ width: `${(current / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <ol className="hidden items-center sm:flex">
        {STEPS.map((s, idx) => {
          const state = s.id < current ? 'done' : s.id === current ? 'active' : 'upcoming';
          return (
            <li key={s.id} className={`flex items-center ${idx < STEPS.length - 1 ? 'flex-1' : ''}`}>
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    state === 'done'
                      ? 'bg-primary-700 text-white'
                      : state === 'active'
                        ? 'bg-primary-700 text-white ring-4 ring-primary-100'
                        : 'border border-gray-300 bg-white text-gray-400'
                  }`}
                >
                  {state === 'done' ? <CheckCircleIcon className="h-4 w-4" /> : s.id}
                </div>
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wide ${
                    state === 'upcoming' ? 'text-gray-400' : 'text-gray-900'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`mx-2 h-0.5 flex-1 rounded ${s.id < current ? 'bg-primary-700' : 'bg-gray-200'}`} />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function WizardCard({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div
      className={`mx-auto mt-6 w-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 ${
        wide ? 'max-w-5xl' : 'max-w-lg'
      }`}
    >
      {children}
    </div>
  );
}

function FooterNav({
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled,
  showBack = true,
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showBack?: boolean;
}) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3 border-t border-gray-100 pt-6">
      {showBack ? (
        <button type="button" onClick={onBack} className="text-sm font-medium text-gray-500 hover:text-gray-700">
          ← Back
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {nextLabel}
      </button>
    </div>
  );
}

function BulkImportWizard() {
  const { user } = useAuth();
  const [step, setStep] = useState<WizardStep>(1);

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [imagesZip, setImagesZip] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});

  const [previewTab, setPreviewTab] = useState<'table' | 'visual'>('table');

  // How many products the vendor already has — needed to predict whether
  // this import will get capped, since (unlike a brand-new catalog) it's
  // adding to an existing library, not starting from zero. Only free-plan
  // vendors can hit the cap at all, so paid accounts skip the fetch.
  const [existingProductCount, setExistingProductCount] = useState<number | null>(null);

  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const importProgress = useSimulatedProgress(importing);

  useEffect(() => {
    if (!isFreePlan(user)) return;
    apiFetch<{ pagination: { total: number } }>('/products?page=1&limit=1')
      .then((res) => setExistingProductCount(res.pagination.total))
      .catch(() => {
        // Non-fatal — the Preview step just won't show a precise
        // will-be-capped prediction; the server still enforces the cap.
      });
  }, [user]);

  function goTo(target: WizardStep) {
    setStep(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetWizard() {
    setExcelFile(null);
    setImagesZip(null);
    setFileError('');
    setParseResult(null);
    setFieldMappings({});
    setImportError('');
    setImportResult(null);
    goTo(1);
  }

  const step1Valid = excelFile !== null;

  const totalRows = parseResult?.totalRows ?? 0;
  const remainingSlots =
    !isFreePlan(user) || existingProductCount === null ? null : Math.max(FREE_PRODUCT_LIMIT - existingProductCount, 0);
  const willBeCapped = remainingSlots !== null && totalRows > remainingSlots;

  function handleExcelChange(e: ChangeEvent<HTMLInputElement>) {
    setFileError('');
    setParseResult(null);
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!/\.(xlsx|xls)$/i.test(selected.name)) {
      setFileError('Only Excel files (.xlsx, .xls) are supported');
      return;
    }
    if (selected.size > MAX_EXCEL_SIZE) {
      setFileError('File is too large — the limit is 10MB');
      return;
    }
    setExcelFile(selected);
  }

  function handleZipChange(e: ChangeEvent<HTMLInputElement>) {
    setFileError('');
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!/\.zip$/i.test(selected.name)) {
      setFileError('Product images must be a .zip file');
      return;
    }
    if (selected.size > MAX_ZIP_SIZE) {
      setFileError('ZIP file is too large — the limit is 900MB');
      return;
    }
    setImagesZip(selected);
  }

  function formatSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function previewValue(row: Record<string, unknown>, field: string, fallback = '—') {
    const column = fieldMappings[field];
    return (column && String(row[column] ?? '')) || fallback;
  }

  async function handleUploadContinue() {
    if (!excelFile) return;
    setParsing(true);
    setParseError('');
    try {
      const formData = new FormData();
      formData.append('file', excelFile);
      const res = await apiFetch<ParseResult>('/upload/parse-catalog', { method: 'POST', formData });
      const mappings = autoMapHeaders(res.headers);
      if (!mappings.productName || !mappings.price) {
        setParseError(
          'Could not automatically find Product Name and Price columns in your file — make sure your sheet has clearly labeled headers for these.'
        );
        return;
      }
      setParseResult(res);
      setFieldMappings(mappings);
      goTo(2);
    } catch (err) {
      setParseError(err instanceof ApiError ? err.message : 'Could not read this file. Please try again.');
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    if (!excelFile) return;
    setImporting(true);
    setImportError('');
    try {
      const formData = new FormData();
      formData.append('file', excelFile);
      formData.append('fieldMappings', JSON.stringify(fieldMappings));
      if (imagesZip) formData.append('imagesZip', imagesZip);

      const res = await apiFetch<ImportResult>('/products/bulk-import', { method: 'POST', formData });
      setImportResult(res);
      goTo(3);
    } catch (err) {
      setImportError(err instanceof ApiError ? err.message : 'Could not import your products. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <DashboardLayout title="Bulk Import Products">
        <StepIndicator current={step} />

        {/* ---------------- Step 1: Upload Data ---------------- */}
        {step === 1 && (
          <WizardCard wide>
            <h1 className="text-xl font-bold text-gray-900">Upload your product data</h1>
            <p className="mt-1 text-sm text-gray-500">
              Imported products land in your library — link them to any catalog afterward.
            </p>

            <a
              href={`${API_URL}/products/bulk-import-sample`}
              className="mt-4 flex items-center gap-4 rounded-lg border-2 border-primary-200 bg-primary-50 p-4 transition-colors hover:border-primary-300 hover:bg-primary-100"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-700 text-white">
                <DownloadIcon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Download the sample Excel template</p>
                <p className="mt-0.5 text-xs text-gray-600">
                  Pre-filled with every supported column (including Specifications) and two example rows, plus a
                  Reference tab listing your existing categories and specifications.
                </p>
              </div>
              <span className="shrink-0 rounded-lg bg-primary-700 px-3.5 py-2 text-xs font-semibold text-white">
                Download
              </span>
            </a>

            <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                File Requirements — Read Before Uploading
              </div>

              <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <GridIcon className="h-4 w-4 text-primary-700" />
                    Your Excel File
                  </p>
                  <ol className="mt-2.5 space-y-2.5 text-sm text-gray-600">
                    <li className="flex gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[11px] font-bold text-primary-700">
                        1
                      </span>
                      <span>
                        File must be <strong className="text-gray-900">.xlsx or .xls</strong> format, up to{' '}
                        <strong className="text-gray-900">10MB</strong>
                      </span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[11px] font-bold text-primary-700">
                        2
                      </span>
                      <span>
                        The <strong className="text-gray-900">first row</strong> must be column headers — data
                        starts on row 2
                      </span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[11px] font-bold text-primary-700">
                        3
                      </span>
                      <span>Only the first sheet in the file is read; extra sheets are ignored</span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[11px] font-bold text-primary-700">
                        4
                      </span>
                      <span>
                        Required columns: <strong className="text-gray-900">Product Name</strong>,{' '}
                        <strong className="text-gray-900">Price</strong>
                      </span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[11px] font-bold text-primary-700">
                        5
                      </span>
                      <span>
                        Optional columns: Description, Category, Unit, Specifications, Image URL, Image Filename,
                        Video URL
                      </span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[11px] font-bold text-primary-700">
                        6
                      </span>
                      <span>
                        Prices should be plain numbers (e.g.{' '}
                        <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">499</code>, not{' '}
                        <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">$499.00</code>)
                      </span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[11px] font-bold text-primary-700">
                        7
                      </span>
                      <span>
                        Specifications go in one column as{' '}
                        <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">Key: Value</code> pairs
                        separated by semicolons, e.g.{' '}
                        <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">
                          Color: Red; Size: Large
                        </code>
                      </span>
                    </li>
                  </ol>
                </div>

                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <BoxIcon className="h-4 w-4 text-primary-700" />
                    Product Images
                  </p>
                  <ol className="mt-2.5 space-y-2.5 text-sm text-gray-600">
                    <li className="flex gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary-100 text-[11px] font-bold text-secondary-700">
                        1
                      </span>
                      <span>
                        Already have image URLs in your sheet? <strong className="text-gray-900">Skip the ZIP</strong>{' '}
                        entirely — you&apos;re done
                      </span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary-100 text-[11px] font-bold text-secondary-700">
                        2
                      </span>
                      <span>
                        Otherwise, add an <strong className="text-gray-900">Image Filename</strong> column naming
                        each photo (e.g.{' '}
                        <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">rug-5x7.jpg</code>)
                      </span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary-100 text-[11px] font-bold text-secondary-700">
                        3
                      </span>
                      <span>Upload those exact photos together as a single .zip, up to 900MB total</span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary-100 text-[11px] font-bold text-secondary-700">
                        4
                      </span>
                      <span>Filenames are case-sensitive and must match the column exactly</span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary-100 text-[11px] font-bold text-secondary-700">
                        5
                      </span>
                      <span>Each image is resized and compressed automatically — no need to pre-resize</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label
                htmlFor="excelFile"
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center transition-colors hover:border-primary-400 hover:bg-primary-50"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                  <GridIcon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-semibold text-gray-900">
                  {excelFile ? excelFile.name : 'Drag & drop your Excel file'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {excelFile ? formatSize(excelFile.size) : 'or click to browse — .xlsx, .xls'}
                </p>
                {excelFile && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setExcelFile(null);
                      setParseResult(null);
                    }}
                    className="mt-3 text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
                <input id="excelFile" type="file" accept=".xlsx,.xls" onChange={handleExcelChange} className="hidden" />
              </label>

              <label
                htmlFor="imagesZip"
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center transition-colors hover:border-primary-400 hover:bg-primary-50"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary-100 text-secondary-700">
                  <UploadIcon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-semibold text-gray-900">
                  {imagesZip ? imagesZip.name : 'Product images (optional)'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {imagesZip ? formatSize(imagesZip.size) : 'Skip if your sheet already has image URLs — .zip'}
                </p>
                {imagesZip && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setImagesZip(null);
                    }}
                    className="mt-3 text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
                <input id="imagesZip" type="file" accept=".zip" onChange={handleZipChange} className="hidden" />
              </label>
            </div>

            {(fileError || parseError) && (
              <div className="mt-5">
                <Alert variant="error">{fileError || parseError}</Alert>
              </div>
            )}

            <FooterNav
              showBack={false}
              onNext={handleUploadContinue}
              nextLabel={parsing ? 'Reading file…' : 'Continue'}
              nextDisabled={!step1Valid || parsing}
            />
          </WizardCard>
        )}

        {/* ---------------- Step 2: Preview & Validate ---------------- */}
        {step === 2 && parseResult && !importing && (
          <WizardCard wide>
            <h1 className="text-xl font-bold text-gray-900">Review before you import</h1>
            <p className="mt-1 text-sm text-gray-500">
              Here&apos;s what we found in your file. Nothing is added to your library yet — check it looks right
              first.
            </p>

            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center sm:w-40 sm:shrink-0">
                <p className="text-2xl font-bold text-gray-900">{parseResult.totalRows}</p>
                <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">Products Found</p>
              </div>
              <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Columns Detected</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(fieldMappings).map(([field, column]) => (
                    <span key={field} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm">
                      {MAPPABLE_FIELD_LABELS[field] || field}
                      <span className="text-gray-400"> → &quot;{column}&quot;</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 inline-flex rounded-full border border-gray-200 bg-gray-50 p-1">
              <button
                type="button"
                onClick={() => setPreviewTab('table')}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  previewTab === 'table' ? 'bg-primary-700 text-white' : 'text-gray-500'
                }`}
              >
                Data Table
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('visual')}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  previewTab === 'visual' ? 'bg-primary-700 text-white' : 'text-gray-500'
                }`}
              >
                Visual Preview
              </button>
            </div>

            {previewTab === 'table' ? (
              <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Price</th>
                        <th className="px-4 py-3">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parseResult.dataPreview.map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 font-medium text-gray-900">{previewValue(row, 'productName')}</td>
                          <td className="px-4 py-3 text-gray-600">{previewValue(row, 'price')}</td>
                          <td className="px-4 py-3 text-gray-600">{previewValue(row, 'category')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="border-t border-gray-100 bg-gray-50 px-4 py-2.5 text-xs text-gray-500">
                  Showing {parseResult.dataPreview.length} of {parseResult.totalRows} rows — full validation happens
                  when you import.
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:p-5">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {parseResult.dataPreview.map((row, idx) => (
                    <div key={idx} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                      <div className="flex aspect-square items-center justify-center bg-primary-50 text-primary-700">
                        <BoxIcon className="h-6 w-6 opacity-50" />
                      </div>
                      <div className="p-3">
                        <p className="truncate text-xs font-semibold text-gray-900">
                          {previewValue(row, 'productName', 'Untitled')}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">{previewValue(row, 'price')}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-center text-xs text-gray-500">
                  Simplified preview — each product&apos;s real image shows once it&apos;s in your library.
                </p>
              </div>
            )}

            <div className="mt-5 flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-600">
              {willBeCapped ? (
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              ) : (
                <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              )}
              <span>
                {willBeCapped
                  ? `The free plan is limited to ${FREE_PRODUCT_LIMIT} products total, and you have ${
                      existingProductCount ?? 0
                    } already — we'll import the first ${remainingSlots} of these ${
                      parseResult.totalRows
                    } and skip the rest. You can upgrade anytime later to bring the rest in.`
                  : `All ${parseResult.totalRows} products will be added to your library.`}
              </span>
            </div>

            {importError && (
              <div className="mt-5">
                <Alert variant="error">{importError}</Alert>
              </div>
            )}

            <FooterNav
              onBack={() => goTo(1)}
              onNext={handleImport}
              nextLabel={importing ? 'Importing…' : 'Import Products'}
              nextDisabled={importing}
            />
          </WizardCard>
        )}

        {/* ---------------- Importing: shown in place of Step 2/3 while the
            bulk-import request is in flight. Same simulated-progress
            pattern as the catalog wizard — no real server-side progress
            signal (single request), so this eases toward ~92% and holds. ---------------- */}
        {importing && (
          <WizardCard>
            <div className="py-4 text-center">
              <SpinnerIcon className="mx-auto h-8 w-8 animate-spin text-primary-700" />
              <h1 className="mt-4 text-xl font-bold text-gray-900">Importing your products…</h1>
              <p className="mt-1 text-sm text-gray-500">
                {importProgress < 35
                  ? 'Reading your file…'
                  : importProgress < 65
                    ? 'Matching categories and images…'
                    : importProgress < 90
                      ? 'Creating your products…'
                      : 'Almost done…'}
              </p>
              <div className="mx-auto mt-6 max-w-sm">
                <ProgressBar percent={importProgress} />
              </div>
              <p className="mt-3 text-xs text-gray-400">
                This can take a moment for larger files — please don&apos;t close this page.
              </p>
            </div>
          </WizardCard>
        )}

        {/* ---------------- Step 3: Done ---------------- */}
        {step === 3 && importResult && (
          <WizardCard>
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
                <CheckCircleIcon className="h-7 w-7" />
              </div>
              <h1 className="mt-4 text-xl font-bold text-gray-900">Products imported! 🎉</h1>
              <p className="mt-1 text-sm text-gray-500">
                {importResult.productsCreated} product{importResult.productsCreated === 1 ? '' : 's'} added to your
                library.
              </p>

              {importResult.planLimit && (
                <div className="mt-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-left text-xs text-amber-800">
                  <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Only {importResult.planLimit.imported} of your {importResult.planLimit.totalValidRows} products
                    were imported — the Free plan is capped at {importResult.planLimit.limit} total.{' '}
                    <button
                      type="button"
                      onClick={() => setUpgradeModalOpen(true)}
                      className="font-semibold underline hover:text-amber-900"
                    >
                      Upgrade
                    </button>{' '}
                    anytime to add the rest.
                  </span>
                </div>
              )}

              {(importResult.errors.length > 0 || importResult.warnings.length > 0) && (
                <div className="mt-4 space-y-2 text-left">
                  {importResult.errors.length > 0 && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                      <p className="flex items-center gap-1.5 font-semibold">
                        <ExclamationCircleIcon className="h-3.5 w-3.5" /> {importResult.errors.length} row(s) skipped:
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {importResult.errors.slice(0, 5).map((e) => (
                          <li key={e.rowNumber}>
                            Row {e.rowNumber}: {e.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {importResult.warnings.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      <p className="flex items-center gap-1.5 font-semibold">
                        <ExclamationTriangleIcon className="h-3.5 w-3.5" /> {importResult.warnings.length} warning(s):
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {importResult.warnings.slice(0, 5).map((w) => (
                          <li key={w.rowNumber}>
                            Row {w.rowNumber}: {w.warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={resetWizard}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Import More
                </button>
                <Link
                  href="/dashboard/products"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-800"
                >
                  View Products
                </Link>
              </div>
            </div>
          </WizardCard>
        )}
      </DashboardLayout>
      <UpgradePlanModal isOpen={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} reason="product" />
    </>
  );
}

export default withAuth(BulkImportWizard);
