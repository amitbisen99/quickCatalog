import { ChangeEvent, FormEvent, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import Alert from '@/components/Alert';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  ExternalLinkIcon,
  UploadIcon,
  GridIcon,
  BoxIcon,
  DownloadIcon,
} from '@/components/icons';
import { apiFetch, ApiError, API_URL } from '@/utils/api';
import { autoMapHeaders } from '@/utils/fuzzyMapHeaders';

// Reached via CreateCatalogModal's "Import File" option on
// /dashboard/catalogs — the modal's other option, "Create Manually", stays
// a plain name+description form that lands on the new (empty) catalog's
// own page instead of running this wizard. Same guided step flow as the
// standalone pre-signup wizard (frontend/pages/create-catalog/index.tsx:
// Catalog Details → Upload → Preview → Plan → Done, same API calls, same
// free-tier plan-limit handling), just re-skinned to the dashboard's own
// navy/gold theme and running inside DashboardLayout since the vendor is
// already logged in and already inside the panel.

// Mirrors backend/src/utils/planLimits.js — the server is the real
// enforcer, these only drive display copy and when the Plan step shows.
const FREE_PRODUCT_LIMIT = 500;
const FREE_CATALOG_LIMIT: number = 20;

type WizardStep = 1 | 2 | 3 | 4 | 5;

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 1, label: 'Catalog' },
  { id: 2, label: 'Upload' },
  { id: 3, label: 'Preview' },
  { id: 4, label: 'Plan' },
  { id: 5, label: 'Done' },
];

const MAPPABLE_FIELD_LABELS: Record<string, string> = {
  productName: 'Product Name',
  price: 'Price',
  description: 'Description',
  category: 'Category',
  unit: 'Unit',
  specifications: 'Specifications',
  imageFilename: 'Image Filename',
  imageUrl: 'Image URL',
  videoUrl: 'Video URL',
};

interface CatalogData {
  name: string;
  description: string;
}

interface ParseResult {
  headers: string[];
  dataPreview: Record<string, unknown>[];
  totalRows: number;
}

interface CreateResult {
  catalog: {
    id: string;
    name: string;
    description?: string;
    slug: string;
    qrCode: string;
    template: string;
    productsCount: number;
  };
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
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-gray-500 hover:text-gray-700"
        >
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

const inputClass =
  'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600';

function CreateCatalogWizard() {
  const [step, setStep] = useState<WizardStep>(1);

  const [catalog, setCatalog] = useState<CatalogData>({ name: '', description: '' });

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [imagesZip, setImagesZip] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});

  const [selectedPlan, setSelectedPlan] = useState<'free' | 'paid' | null>(null);
  const [previewTab, setPreviewTab] = useState<'table' | 'visual'>('table');

  const [upgrading, setUpgrading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createResult, setCreateResult] = useState<CreateResult | null>(null);

  function goTo(target: WizardStep) {
    setStep(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const step1Valid = catalog.name.trim().length > 0;
  const step2Valid = excelFile !== null;

  const totalRows = parseResult?.totalRows ?? 0;
  const requiresPlanSelection = totalRows > FREE_PRODUCT_LIMIT;

  function handleExcelChange(e: ChangeEvent<HTMLInputElement>) {
    setExcelFile(e.target.files?.[0] ?? null);
    setParseResult(null);
  }
  function handleZipChange(e: ChangeEvent<HTMLInputElement>) {
    setImagesZip(e.target.files?.[0] ?? null);
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
      goTo(3);
    } catch (err) {
      setParseError(err instanceof ApiError ? err.message : 'Could not read this file. Please try again.');
    } finally {
      setParsing(false);
    }
  }

  async function createCatalog() {
    if (!excelFile) return;
    setCreating(true);
    setCreateError('');
    try {
      const formData = new FormData();
      formData.append('file', excelFile);
      formData.append('catalogName', catalog.name);
      formData.append('catalogDescription', catalog.description);
      formData.append('fieldMappings', JSON.stringify(fieldMappings));
      if (imagesZip) formData.append('imagesZip', imagesZip);

      const res = await apiFetch<CreateResult>('/catalogs/create-from-file', { method: 'POST', formData });
      setCreateResult(res);
      goTo(5);
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Could not create your catalog. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  function handlePreviewContinue() {
    if (requiresPlanSelection) {
      goTo(4);
    } else {
      setSelectedPlan('free');
      void createCatalog();
    }
  }

  async function handlePlanContinue() {
    if (!selectedPlan) return;
    setCreateError('');
    if (selectedPlan === 'paid') {
      setUpgrading(true);
      try {
        await apiFetch('/users/upgrade-plan', { method: 'PUT' });
      } catch (err) {
        setCreateError(err instanceof ApiError ? err.message : 'Could not upgrade your plan. Please try again.');
        setUpgrading(false);
        return;
      }
      setUpgrading(false);
    }
    await createCatalog();
  }

  return (
    <DashboardLayout title="Create Catalog">
      <StepIndicator current={step} />

      {/* ---------------- Step 1: Catalog Details ---------------- */}
      {step === 1 && (
        <WizardCard>
          <h1 className="text-xl font-bold text-gray-900">Tell us about your catalog</h1>
          <p className="mt-1 text-sm text-gray-500">You can change this anytime after it&apos;s created.</p>

          <form className="mt-6 space-y-4" onSubmit={(e: FormEvent) => e.preventDefault()} noValidate>
            <div>
              <label htmlFor="catalogName" className="block text-sm font-medium text-gray-700">
                Catalog Name
              </label>
              <input
                id="catalogName"
                type="text"
                value={catalog.name}
                onChange={(e) => setCatalog((c) => ({ ...c, name: e.target.value }))}
                className={inputClass}
                placeholder="e.g. Summer 2026 Home Decor Collection"
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="catalogDescription" className="block text-sm font-medium text-gray-700">
                  Description (optional)
                </label>
                <span className="text-xs text-gray-400">{catalog.description.length}/200</span>
              </div>
              <textarea
                id="catalogDescription"
                rows={3}
                maxLength={200}
                value={catalog.description}
                onChange={(e) => setCatalog((c) => ({ ...c, description: e.target.value }))}
                className={inputClass}
                placeholder="A short line about what this catalog is for — shown at the top of your public page."
              />
            </div>
          </form>

          <FooterNav showBack={false} onNext={() => goTo(2)} nextDisabled={!step1Valid} />
        </WizardCard>
      )}

      {/* ---------------- Step 2: Upload Data ---------------- */}
      {step === 2 && (
        <WizardCard wide>
          <h1 className="text-xl font-bold text-gray-900">Upload your product data</h1>
          <p className="mt-1 text-sm text-gray-500">
            We&apos;ll turn your spreadsheet into a full catalog automatically.
          </p>

          <a
            href={`${API_URL}/catalogs/create-from-file-sample`}
            className="mt-4 flex items-center gap-4 rounded-lg border-2 border-primary-200 bg-primary-50 p-4 transition-colors hover:border-primary-300 hover:bg-primary-100"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-700 text-white">
              <DownloadIcon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Download the sample Excel template</p>
              <p className="mt-0.5 text-xs text-gray-600">
                Pre-filled with every supported column (including Specifications) and two example rows — the
                fastest way to get the format right on the first try.
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
                      The <strong className="text-gray-900">first row</strong> must be column headers — data starts
                      on row 2
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
                      Otherwise, add an <strong className="text-gray-900">Image Filename</strong> column naming each
                      photo (e.g. <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">rug-5x7.jpg</code>)
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

          {parseError && (
            <div className="mt-5">
              <Alert variant="error">{parseError}</Alert>
            </div>
          )}

          <FooterNav
            onBack={() => goTo(1)}
            onNext={handleUploadContinue}
            nextLabel={parsing ? 'Reading file…' : 'Continue'}
            nextDisabled={!step2Valid || parsing}
          />
        </WizardCard>
      )}

      {/* ---------------- Step 3: Preview & Validate ---------------- */}
      {step === 3 && parseResult && (
        <WizardCard wide>
          <h1 className="text-xl font-bold text-gray-900">Review before you go live</h1>
          <p className="mt-1 text-sm text-gray-500">
            Here&apos;s what we found in your file. Nothing is public yet — check it looks right first.
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
                when you create your catalog.
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
                Simplified preview — your live catalog uses your selected template&apos;s full design.
              </p>
            </div>
          )}

          {!requiresPlanSelection && (
            <div className="mt-5 flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-600">
              <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              <span>
                {parseResult.totalRows} products fits comfortably on the Free plan, so there&apos;s nothing to
                choose — we&apos;ll create your catalog on Free automatically. You can upgrade anytime later.
              </span>
            </div>
          )}

          {createError && (
            <div className="mt-5">
              <Alert variant="error">{createError}</Alert>
            </div>
          )}

          <FooterNav
            onBack={() => goTo(2)}
            onNext={handlePreviewContinue}
            nextLabel={creating ? 'Creating…' : requiresPlanSelection ? 'Looks good, continue' : 'Create My Catalog'}
            nextDisabled={creating}
          />
        </WizardCard>
      )}

      {/* ---------------- Step 4: Choose Plan ---------------- */}
      {step === 4 && (
        <WizardCard wide>
          <h1 className="text-xl font-bold text-gray-900">Choose your plan</h1>
          <p className="mt-1 text-sm text-gray-500">
            You&apos;re importing <strong className="text-gray-900">{totalRows} products</strong>. Pick the plan
            that fits.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setSelectedPlan('free')}
              className={`relative rounded-lg border-2 p-5 text-left transition-all ${
                selectedPlan === 'free' ? 'border-primary-700 bg-primary-50' : 'border-gray-200 bg-white hover:border-primary-300'
              }`}
            >
              {selectedPlan === 'free' && (
                <span className="absolute -top-3 right-4 rounded-full bg-primary-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Selected
                </span>
              )}
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Free</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                ₹0<span className="text-sm font-medium text-gray-500"> / forever</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" /> Up to {FREE_PRODUCT_LIMIT} products
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" /> {FREE_CATALOG_LIMIT} catalog
                  {FREE_CATALOG_LIMIT === 1 ? '' : 's'}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" /> Shareable public link
                </li>
                <li className="flex items-center gap-2 text-gray-400">
                  Only first {FREE_PRODUCT_LIMIT} of your {totalRows} products import
                </li>
              </ul>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPlan('paid')}
              className={`relative rounded-lg border-2 p-5 text-left transition-all ${
                selectedPlan === 'paid' ? 'border-primary-700 bg-primary-50' : 'border-gray-200 bg-white hover:border-primary-300'
              }`}
            >
              <span className="absolute -top-3 left-4 rounded-full bg-secondary-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Recommended
              </span>
              {selectedPlan === 'paid' && (
                <span className="absolute -top-3 right-4 rounded-full bg-primary-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Selected
                </span>
              )}
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Pro</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                ₹999<span className="text-sm font-medium text-gray-500"> / month</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" /> Unlimited products
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" /> Unlimited catalogs
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" /> Custom branding &amp; templates
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" /> All {totalRows} products import
                </li>
              </ul>
            </button>
          </div>

          {createError && (
            <div className="mt-5">
              <Alert variant="error">{createError}</Alert>
            </div>
          )}

          <FooterNav
            onBack={() => goTo(3)}
            onNext={handlePlanContinue}
            nextLabel={upgrading ? 'Upgrading…' : creating ? 'Creating…' : 'Create My Catalog'}
            nextDisabled={!selectedPlan || upgrading || creating}
          />
        </WizardCard>
      )}

      {/* ---------------- Step 5: Success ---------------- */}
      {step === 5 && createResult && (
        <WizardCard>
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
              <CheckCircleIcon className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-gray-900">Your catalog is live! 🎉</h1>
            <p className="mt-1 text-sm text-gray-500">{createResult.catalog.name} is published and ready to share.</p>

            <div className="mt-5 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2 pl-4">
              <span className="flex-1 truncate text-left text-sm font-medium text-gray-900">
                {process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || 'localhost:3010'}/public/
                {createResult.catalog.slug}
              </span>
            </div>

            <div className="mx-auto mt-5 flex h-28 w-28 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={createResult.catalog.qrCode}
                alt="Catalog QR code"
                className="h-full w-full object-contain"
              />
            </div>

            {createResult.planLimit && (
              <div className="mt-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-left text-xs text-amber-800">
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Only {createResult.planLimit.imported} of your {createResult.planLimit.totalValidRows} products
                  were imported — the Free plan is capped at {createResult.planLimit.limit}. Upgrade anytime from
                  Settings to add the rest.
                </span>
              </div>
            )}

            {(createResult.errors.length > 0 || createResult.warnings.length > 0) && (
              <div className="mt-4 space-y-2 text-left">
                {createResult.errors.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    <p className="flex items-center gap-1.5 font-semibold">
                      <ExclamationCircleIcon className="h-3.5 w-3.5" /> {createResult.errors.length} row(s) skipped:
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {createResult.errors.slice(0, 5).map((e) => (
                        <li key={e.rowNumber}>
                          Row {e.rowNumber}: {e.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {createResult.warnings.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    <p className="flex items-center gap-1.5 font-semibold">
                      <ExclamationTriangleIcon className="h-3.5 w-3.5" /> {createResult.warnings.length} warning(s):
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {createResult.warnings.slice(0, 5).map((w) => (
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
              <a
                href={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010'}/public/${createResult.catalog.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <ExternalLinkIcon className="h-4 w-4" />
                View Live Catalog
              </a>
              <Link
                href={`/dashboard/catalogs/${createResult.catalog.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-800"
              >
                Go to My Catalog
              </Link>
            </div>
          </div>
        </WizardCard>
      )}
    </DashboardLayout>
  );
}

export default withAuth(CreateCatalogWizard);
