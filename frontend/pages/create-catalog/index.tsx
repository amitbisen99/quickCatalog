import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch, ApiError, API_URL } from '@/utils/api';
import { autoMapHeaders } from '@/utils/fuzzyMapHeaders';
import { getCatalogPublicUrl } from '@/utils/catalogUrl';
import { isFreePlan } from '@/utils/planLimit';

// Standalone "create your catalog" funnel — deliberately separate from the
// vendor dashboard (no DashboardLayout/AdminLayout, no sidebar nav). Entered
// from the "Start Free" CTA on the marketing homepage, so it borrows the
// homepage's brand-* palette/typography (tailwind.config.js) and Font
// Awesome icon set instead of the dashboard's primary/secondary navy+gold
// theme, so it reads as a continuation of the site the visitor just clicked
// from.
//
// Account creation is NOT a step in this wizard — /verify-email already
// collects businessName/businessType/industry as the final step of
// registration and logs the vendor straight in, so this wizard does not
// ask for any of that again.
//
// NOT currently in the normal signup path: /verify-email now redirects to
// /dashboard/catalogs (the vendor panel) rather than here — "Create
// Catalog" → "Create Manually" there runs the same guided flow as this
// page (see frontend/pages/dashboard/catalogs/create.tsx), just re-skinned
// to the dashboard's theme. This standalone page is left intact per
// explicit request and still fully works for anyone who lands on it
// directly (already-authenticated visitors only — the guard below still
// redirects everyone else to /signup), it's just no longer where the
// normal signup flow sends people.
//
// FUNCTIONAL: every step now calls the real API.
//   Upload → Preview: POST /upload/parse-catalog (Excel only — headers,
//     a 5-row sample, and the real total row count), then autoMapHeaders
//     picks the column mapping automatically (no manual-mapping screen
//     exists here).
//   Create: POST /catalogs/create-from-file (FormData: file, catalogName,
//     catalogDescription, fieldMappings, optional imagesZip) — creates the
//     catalog and its products in one call. Every catalog is created on
//     Free — there's no plan-choice step. Free tier is capped at
//     FREE_PRODUCT_LIMIT products per catalog server-side; the response's
//     `planLimit` field reports if this import got truncated.

// Mirrors backend/src/utils/planLimits.js — the server is the real
// enforcer, this only drives display copy on the Preview step.
const FREE_PRODUCT_LIMIT = 10;

type WizardStep = 1 | 2 | 3 | 4;

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 1, label: 'Catalog' },
  { id: 2, label: 'Upload' },
  { id: 3, label: 'Preview' },
  { id: 4, label: 'Done' },
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
      {/* Mobile: compact progress bar */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between text-xs font-semibold text-brand-muted">
          <span>
            Step {current} of {STEPS.length}
          </span>
          <span className="text-brand-text">{STEPS[current - 1].label}</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-brand-border">
          <div
            className="h-full rounded-full bg-brand-accent transition-all"
            style={{ width: `${(current / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop/tablet: full stepper */}
      <ol className="hidden items-center sm:flex">
        {STEPS.map((s, idx) => {
          const state = s.id < current ? 'done' : s.id === current ? 'active' : 'upcoming';
          return (
            <li key={s.id} className={`flex items-center ${idx < STEPS.length - 1 ? 'flex-1' : ''}`}>
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    state === 'done'
                      ? 'bg-brand-accent text-white'
                      : state === 'active'
                        ? 'bg-brand-accent text-white ring-4 ring-brand-accent-light'
                        : 'bg-white text-brand-muted border border-brand-border'
                  }`}
                >
                  {state === 'done' ? <i className="fa-solid fa-check text-[11px]" /> : s.id}
                </div>
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wide ${
                    state === 'upcoming' ? 'text-brand-muted' : 'text-brand-text'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`mx-2 h-0.5 flex-1 rounded ${s.id < current ? 'bg-brand-accent' : 'bg-brand-border'}`} />
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
      className={`mx-auto mt-8 w-full rounded-3xl border border-brand-border bg-white p-6 shadow-xl shadow-brand-accent/5 sm:p-10 ${
        wide ? 'max-w-3xl' : 'max-w-lg'
      }`}
    >
      {children}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <i className="fa-solid fa-circle-exclamation mt-0.5" />
      <span>{message}</span>
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
    <div className="mt-8 flex items-center justify-between gap-3 border-t border-brand-border pt-6">
      {showBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-brand-muted transition-colors hover:text-brand-text"
        >
          <i className="fa-solid fa-arrow-left text-xs" />
          Back
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="inline-flex items-center gap-2 rounded-2xl bg-brand-accent px-7 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-brand-accent/25 transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
      >
        {nextLabel}
        <i className="fa-solid fa-arrow-right text-xs" />
      </button>
    </div>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-bold text-brand-text">
      {children}
    </label>
  );
}

const inputClass =
  'mt-1.5 w-full rounded-xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-text placeholder:text-brand-muted/60 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/20';

export default function CreateCatalogWizard() {
  // Session guard — this page is the destination of the signup → verify
  // flow, not a public page. Without this, anyone could open
  // /create-catalog directly, bypassing registration entirely. Redirects
  // to /signup (not /login) since that's this flow's actual entry point.
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/signup');
    }
  }, [loading, user, router]);

  const [step, setStep] = useState<WizardStep>(1);

  const [catalog, setCatalog] = useState<CatalogData>({ name: '', description: '' });

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [imagesZip, setImagesZip] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});

  const [previewTab, setPreviewTab] = useState<'table' | 'visual'>('table');

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createResult, setCreateResult] = useState<CreateResult | null>(null);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg">
        <div className="flex flex-col items-center gap-3 text-brand-muted">
          <i className="fa-solid fa-spinner fa-spin text-2xl text-brand-accent" />
          <p className="text-sm font-semibold">Loading…</p>
        </div>
      </div>
    );
  }

  function goTo(target: WizardStep) {
    setStep(target);
    // Only ever called from event handlers (button clicks), never during
    // render/SSR, so window is always defined here.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const step1Valid = catalog.name.trim().length > 0;
  const step2Valid = excelFile !== null;

  const totalRows = parseResult?.totalRows ?? 0;
  // Paid vendors have no product cap at all (see planLimits.js's
  // exceedsFreeProductLimit, which the server actually enforces) — this
  // was previously capping the message purely on row count, showing the
  // "free plan" warning even to paid accounts. When the file has more
  // products than Free allows *and* the vendor is actually on Free, the
  // server silently truncates to the first FREE_PRODUCT_LIMIT and this
  // just informs the vendor that's what's about to happen.
  const willBeCapped = isFreePlan(user) && totalRows > FREE_PRODUCT_LIMIT;

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

  // Reads a preview row through the auto-detected column mapping — the
  // field may not have mapped to anything, or the row's value for that
  // column may be blank, either way falling back to a placeholder.
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
      goTo(4);
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Could not create your catalog. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  function handlePreviewContinue() {
    void createCatalog();
  }

  async function handleCopyLink() {
    if (!createResult) return;
    try {
      await navigator.clipboard.writeText(getCatalogPublicUrl(createResult.catalog.slug, user));
    } catch {
      // Clipboard access can fail (permissions, non-secure context) — the
      // URL is already visible and selectable, so this is a soft failure.
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg font-sans text-brand-text antialiased">
      <Head>
        <title>Create Your Catalog | QuickCatalog</title>
      </Head>

      {/* Minimal focused header — logo + exit only, no marketing nav, to
          keep attention on finishing the wizard. */}
      <header className="sticky top-0 z-30 border-b border-brand-border bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-tight text-brand-text">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-accent">
              <i className="fa-solid fa-layer-group text-xs text-white" />
            </span>
            QuickCatalog
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-muted transition-colors hover:text-brand-text"
          >
            Exit
            <i className="fa-solid fa-xmark text-xs" />
          </Link>
        </div>
      </header>

      <main className="px-4 py-10 sm:px-6 sm:py-14">
        <StepIndicator current={step} />

        {/* ---------------- Step 1: Catalog Details ---------------- */}
        {step === 1 && (
          <WizardCard>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-green/30 bg-brand-green-light px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand-green">
              <i className="fa-solid fa-circle-check" />
              Account verified
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">Tell us about your catalog</h1>
            <p className="mt-2 text-sm text-brand-muted">You can change this anytime after it&apos;s created.</p>

            <form className="mt-8 space-y-5" onSubmit={(e: FormEvent) => e.preventDefault()} noValidate>
              <div>
                <FieldLabel htmlFor="catalogName">Catalog Name</FieldLabel>
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
                  <FieldLabel htmlFor="catalogDescription">Description (optional)</FieldLabel>
                  <span className="text-xs text-brand-muted">{catalog.description.length}/200</span>
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
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Upload your product data</h1>
            <p className="mt-2 text-sm text-brand-muted">
              We&apos;ll turn your spreadsheet into a full catalog automatically.{' '}
              <a
                href={`${API_URL}/products/bulk-import-sample`}
                className="font-bold text-brand-accent hover:text-indigo-700"
              >
                Download sample template
              </a>{' '}
              to see the exact format below in action.
            </p>

            {/* File requirements — deliberately NOT the same accent-tinted
                style as the info notes elsewhere in this wizard, so it reads
                as reference material to check against rather than a passing
                tip. Dark, high-contrast body text (not brand-muted) so it's
                actually easy to read, not skimmed past. */}
            <div className="mt-6 rounded-2xl border border-brand-border bg-white p-5 sm:p-6">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand-accent">
                <i className="fa-solid fa-clipboard-list" />
                File Requirements — Read Before Uploading
              </div>

              <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <p className="flex items-center gap-2 text-sm font-bold text-brand-text">
                    <i className="fa-solid fa-file-excel text-brand-green" />
                    Your Excel File
                  </p>
                  <ul className="mt-2.5 space-y-2 text-sm text-brand-text/80">
                    <li>
                      <strong className="text-brand-text">.xlsx or .xls</strong> format only, up to{' '}
                      <strong className="text-brand-text">10MB</strong>
                    </li>
                    <li>
                      The <strong className="text-brand-text">first row</strong> must be column headers — data starts on
                      row 2
                    </li>
                    <li>Only the first sheet in the file is read; extra sheets are ignored</li>
                    <li>
                      Required columns: <strong className="text-brand-text">Product Name</strong>,{' '}
                      <strong className="text-brand-text">Price</strong>
                    </li>
                    <li>Optional columns: Description, Category, Unit, Image Filename, Video URL</li>
                    <li>
                      Prices should be plain numbers (e.g.{' '}
                      <code className="rounded bg-brand-bg px-1.5 py-0.5 font-mono text-xs text-brand-text">499</code>,
                      not{' '}
                      <code className="rounded bg-brand-bg px-1.5 py-0.5 font-mono text-xs text-brand-text">
                        $499.00
                      </code>
                      )
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="flex items-center gap-2 text-sm font-bold text-brand-text">
                    <i className="fa-solid fa-images text-brand-accent" />
                    Product Images
                  </p>
                  <ul className="mt-2.5 space-y-2 text-sm text-brand-text/80">
                    <li>
                      Already have image URLs in your sheet? <strong className="text-brand-text">Skip the ZIP</strong>{' '}
                      entirely — you&apos;re done
                    </li>
                    <li>
                      Otherwise, add an <strong className="text-brand-text">Image Filename</strong> column naming each
                      photo (e.g.{' '}
                      <code className="rounded bg-brand-bg px-1.5 py-0.5 font-mono text-xs text-brand-text">
                        rug-5x7.jpg
                      </code>
                      )
                    </li>
                    <li>Upload those exact photos together as a single .zip, up to 900MB total</li>
                    <li>Filenames are case-sensitive and must match the column exactly</li>
                    <li>Each image is resized and compressed automatically — no need to pre-resize</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Excel dropzone */}
              <label
                htmlFor="excelFile"
                className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand-border bg-brand-bg/60 px-6 py-10 text-center transition-colors hover:border-brand-accent hover:bg-brand-accent-light/40"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-accent-light text-brand-accent">
                  <i className="fa-solid fa-file-excel text-lg" />
                </div>
                <p className="mt-3 text-sm font-bold text-brand-text">
                  {excelFile ? excelFile.name : 'Drag & drop your Excel file'}
                </p>
                <p className="mt-1 text-xs text-brand-muted">
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
                    className="mt-3 text-xs font-bold text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
                <input id="excelFile" type="file" accept=".xlsx,.xls" onChange={handleExcelChange} className="hidden" />
              </label>

              {/* Images ZIP dropzone */}
              <label
                htmlFor="imagesZip"
                className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand-border bg-brand-bg/60 px-6 py-10 text-center transition-colors hover:border-brand-accent hover:bg-brand-accent-light/40"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-accent-light text-brand-accent">
                  <i className="fa-solid fa-images text-lg" />
                </div>
                <p className="mt-3 text-sm font-bold text-brand-text">
                  {imagesZip ? imagesZip.name : 'Product images (optional)'}
                </p>
                <p className="mt-1 text-xs text-brand-muted">
                  {imagesZip ? formatSize(imagesZip.size) : 'Skip if your sheet already has image URLs — .zip'}
                </p>
                {imagesZip && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setImagesZip(null);
                    }}
                    className="mt-3 text-xs font-bold text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
                <input id="imagesZip" type="file" accept=".zip" onChange={handleZipChange} className="hidden" />
              </label>
            </div>

            <ErrorBanner message={parseError} />

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
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Review before you go live</h1>
            <p className="mt-2 text-sm text-brand-muted">
              Here&apos;s what we found in your file. Nothing is public yet — check it looks right first.
            </p>

            {/* Real stat + real detected column mapping, replacing what a
                lightweight parse genuinely can't know yet (per-row status,
                category/warning counts — those only surface once creation
                actually runs each row through full validation). */}
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="rounded-xl border border-brand-border bg-brand-bg/60 p-4 text-center sm:w-40 sm:shrink-0">
                <p className="text-2xl font-black text-brand-text">{parseResult.totalRows}</p>
                <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-muted">
                  Products Found
                </p>
              </div>
              <div className="flex-1 rounded-xl border border-brand-border bg-brand-bg/60 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-brand-muted">Columns Detected</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(fieldMappings).map(([field, column]) => (
                    <span
                      key={field}
                      className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-brand-text shadow-sm"
                    >
                      {MAPPABLE_FIELD_LABELS[field] || field}
                      <span className="text-brand-muted"> → &quot;{column}&quot;</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Tab toggle */}
            <div className="mt-6 inline-flex rounded-full border border-brand-border bg-brand-bg/60 p-1">
              <button
                type="button"
                onClick={() => setPreviewTab('table')}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                  previewTab === 'table' ? 'bg-brand-accent text-white' : 'text-brand-muted'
                }`}
              >
                Data Table
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('visual')}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                  previewTab === 'visual' ? 'bg-brand-accent text-white' : 'text-brand-muted'
                }`}
              >
                Visual Preview
              </button>
            </div>

            {previewTab === 'table' ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-brand-border">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-brand-bg/80 text-[11px] font-bold uppercase tracking-wide text-brand-muted">
                      <tr>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Price</th>
                        <th className="px-4 py-3">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                      {parseResult.dataPreview.map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 font-semibold text-brand-text">
                            {previewValue(row, 'productName')}
                          </td>
                          <td className="px-4 py-3 text-brand-muted">{previewValue(row, 'price')}</td>
                          <td className="px-4 py-3 text-brand-muted">{previewValue(row, 'category')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="border-t border-brand-border bg-brand-bg/40 px-4 py-2.5 text-xs text-brand-muted">
                  Showing {parseResult.dataPreview.length} of {parseResult.totalRows} rows — full validation happens
                  when you create your catalog.
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-brand-border bg-brand-bg/60 p-4 sm:p-6">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {parseResult.dataPreview.map((row, idx) => (
                    <div key={idx} className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
                      <div className="flex aspect-square items-center justify-center bg-brand-accent-light text-brand-accent">
                        <i className="fa-solid fa-image text-2xl opacity-50" />
                      </div>
                      <div className="p-3">
                        <p className="truncate text-xs font-bold text-brand-text">
                          {previewValue(row, 'productName', 'Untitled')}
                        </p>
                        <p className="mt-0.5 text-xs text-brand-muted">{previewValue(row, 'price')}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-center text-xs text-brand-muted">
                  Simplified preview — your live catalog uses your selected template&apos;s full design.
                </p>
              </div>
            )}

            <div className="mt-6 flex items-start gap-3 rounded-xl border border-brand-border bg-white p-4 text-xs text-brand-text/80">
              <i
                className={`fa-solid mt-0.5 ${willBeCapped ? 'fa-triangle-exclamation text-brand-yellow' : 'fa-circle-check text-brand-green'}`}
              />
              <span>
                {willBeCapped
                  ? `The free plan is limited to ${FREE_PRODUCT_LIMIT} products in a catalog, so we'll create your catalog with the first ${FREE_PRODUCT_LIMIT} products automatically. You can upgrade anytime later.`
                  : isFreePlan(user)
                    ? `All ${parseResult.totalRows} products will be added to your catalog — we'll create it on the Free plan automatically. You can upgrade anytime later.`
                    : `All ${parseResult.totalRows} products will be added to your catalog.`}
              </span>
            </div>

            <ErrorBanner message={createError} />

            <FooterNav
              onBack={() => goTo(2)}
              onNext={handlePreviewContinue}
              nextLabel={creating ? 'Creating…' : 'Create My Catalog'}
              nextDisabled={creating}
            />
          </WizardCard>
        )}

        {/* ---------------- Step 4: Success ---------------- */}
        {step === 4 && createResult && (
          <WizardCard>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-green-light text-brand-green">
                <i className="fa-solid fa-check text-2xl" />
              </div>
              <h1 className="mt-5 text-2xl font-black tracking-tight sm:text-3xl">Your catalog is live! 🎉</h1>
              <p className="mt-2 text-sm text-brand-muted">
                {createResult.catalog.name} is published and ready to share.
              </p>

              <div className="mt-6 flex items-center gap-2 rounded-xl border border-brand-border bg-brand-bg/60 p-2 pl-4">
                <span className="flex-1 truncate text-left text-sm font-semibold text-brand-text">
                  {getCatalogPublicUrl(createResult.catalog.slug, user).replace(/^https?:\/\//, '')}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-brand-accent shadow-sm hover:bg-brand-accent-light"
                >
                  <i className="fa-solid fa-copy text-[11px]" /> Copy
                </button>
              </div>

              <div className="mx-auto mt-6 flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border border-brand-border bg-brand-bg/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={createResult.catalog.qrCode} alt="Catalog QR code" className="h-full w-full object-contain" />
              </div>

              {createResult.planLimit && (
                <div className="mt-6 flex items-start gap-3 rounded-xl border border-brand-yellow/30 bg-brand-yellow-light p-4 text-left text-xs text-brand-yellow">
                  <i className="fa-solid fa-triangle-exclamation mt-0.5" />
                  <span>
                    Only {createResult.planLimit.imported} of your {createResult.planLimit.totalValidRows} products
                    were imported — the Free plan is capped at {createResult.planLimit.limit}. Upgrade anytime from
                    your dashboard to add the rest.
                  </span>
                </div>
              )}

              {(createResult.errors.length > 0 || createResult.warnings.length > 0) && (
                <div className="mt-4 space-y-2 text-left">
                  {createResult.errors.length > 0 && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                      <p className="font-bold">{createResult.errors.length} row(s) skipped:</p>
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
                    <div className="rounded-xl border border-brand-yellow/30 bg-brand-yellow-light p-3 text-xs text-brand-yellow">
                      <p className="font-bold">{createResult.warnings.length} warning(s):</p>
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

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <a
                  href={getCatalogPublicUrl(createResult.catalog.slug, user)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-border bg-white px-6 py-3 text-sm font-bold text-brand-text shadow-sm transition-colors hover:bg-brand-bg"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                  View Live Catalog
                </a>
                <Link
                  href="/dashboard/catalogs"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-accent px-6 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-brand-accent/25 transition-all hover:bg-indigo-700"
                >
                  Go to Catalog List
                  <i className="fa-solid fa-arrow-right text-xs" />
                </Link>
              </div>
            </div>
          </WizardCard>
        )}
      </main>
    </div>
  );
}
