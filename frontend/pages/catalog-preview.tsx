import { ChangeEvent, FormEvent, useState } from 'react';
import Link from 'next/link';
import Seo from '@/components/Seo';
import { apiFetch, ApiError } from '@/utils/api';
import { INDUSTRIES } from '@/utils/constants';
import {
  FaArrowRight,
  FaCheck,
  FaCircleCheck,
  FaCloudArrowUp,
  FaFileExcel,
  FaLayerGroup,
} from 'react-icons/fa6';

// Standalone lead-gen landing page — deliberately not the full marketing
// homepage shell (no anchor-link nav, no footer sitemap): the only job
// here is "convert this visitor into a submitted Excel file", so
// everything but the pitch + form is cut. Same brand-* design tokens as
// pages/index.tsx (tailwind.config.js, styles/globals.css) for visual
// consistency with the rest of the site.

const MAX_EXCEL_SIZE = 10 * 1024 * 1024; // 10MB — matches backend's excelUpload limit

const HOW_IT_WORKS = [
  'Send us your product Excel sheet or price list.',
  'Our team formats and designs your digital catalog preview.',
  'Get a live, shareable link & QR code delivered to your WhatsApp in 24 hours.',
  "Subscribe when you're ready to publish.",
];

interface FormState {
  fullName: string;
  email: string;
  whatsappNo: string;
  industry: string;
  numberOfProducts: string;
}

const EMPTY_FORM: FormState = { fullName: '', email: '', whatsappNo: '', industry: '', numberOfProducts: '' };

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-brand-text">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full rounded-xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-text placeholder-brand-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-accent/30';

export default function CatalogPreview() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function updateField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] || null;
    setFileError('');
    if (!selected) {
      setFile(null);
      return;
    }
    if (!/\.(xlsx|xls)$/i.test(selected.name)) {
      setFileError('Only Excel files (.xlsx, .xls) are supported.');
      setFile(null);
      e.target.value = '';
      return;
    }
    if (selected.size > MAX_EXCEL_SIZE) {
      setFileError('File is too large — the limit is 10MB.');
      setFile(null);
      e.target.value = '';
      return;
    }
    setFile(selected);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!file) {
      setFileError('Please attach your product Excel or price list.');
      return;
    }

    const formData = new FormData();
    formData.append('fullName', form.fullName);
    formData.append('email', form.email);
    formData.append('whatsappNo', form.whatsappNo);
    formData.append('industry', form.industry);
    formData.append('numberOfProducts', form.numberOfProducts);
    formData.append('file', file);

    setLoading(true);
    try {
      await apiFetch('/public/catalog-preview-leads', { method: 'POST', formData });
      setSubmitted(true);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white font-sans text-brand-text antialiased">
      <Seo
        title="Free Catalog Preview — Instant Catalog"
        description="Send us your product Excel and we'll build you a free, shareable digital catalog preview with a live link and QR code — delivered to your WhatsApp within 24 hours."
      />

      {/* Minimal top bar — just the logo, no distracting nav on a
          conversion-focused page. */}
      <header className="border-b border-brand-border px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-2 text-xl font-black tracking-tight text-brand-text">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-accent">
            <FaLayerGroup className="text-xs text-white" />
          </span>
          Instant Catalog
        </Link>
      </header>

      <div className="grid md:min-h-[calc(100vh-73px)] md:grid-cols-2">
        {/* Left — pitch */}
        <div className="relative flex items-center overflow-hidden bg-[radial-gradient(130%_130%_at_15%_10%,_#DFFA66_0%,_#B8F000_55%,_#93C400_100%)] px-6 py-16 md:px-14 md:py-20">
          <div className="pointer-events-none absolute top-0 right-0 h-64 w-64 -translate-y-1/3 translate-x-1/4 rounded-full bg-black/5"></div>
          <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 translate-y-1/3 -translate-x-1/4 rounded-full bg-black/5"></div>

          <div className="relative z-10 mx-auto w-full max-w-lg">
            <h1 className="text-3xl font-black leading-tight tracking-tighter text-brand-text md:text-4xl">
              Send Us Your Product Excel — We&apos;ll Build Your Digital Catalog For Free.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-brand-text/70">
              Still sending outdated PDFs or spending hours sending product photos one by one on WhatsApp? Send us
              your Excel product list and our team will create a free catalog preview using your actual products.
            </p>

            <p className="mt-8 text-sm font-bold uppercase tracking-widest text-brand-text/60">👇 Here&apos;s how it works</p>
            <div className="mt-4 space-y-2.5">
              {HOW_IT_WORKS.map((step, i) => (
                <div key={step} className="flex items-start gap-3.5 rounded-2xl bg-white/40 px-4 py-3.5 ring-1 ring-black/5">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-text/15 text-xs font-bold text-brand-text">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-sm leading-snug text-brand-text">{step}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold uppercase tracking-widest text-brand-text/70">
              <span className="flex items-center gap-2">
                <FaCheck /> No Design Skills Needed
              </span>
              <span className="flex items-center gap-2">
                <FaCheck /> No Credit Card Required
              </span>
            </div>

            <div className="mt-10 border-t border-black/10 pt-8 text-center md:text-left">
              <p className="text-sm text-brand-text/70">Don&apos;t have your Excel ready?</p>
              <Link
                href="/public/home-living-collection"
                target="_blank"
                className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-brand-text underline underline-offset-4 hover:text-brand-text/80"
              >
                See a sample catalog <FaArrowRight className="text-xs" />
              </Link>

              <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-brand-text/40">
                <span className="h-px flex-1 bg-black/10"></span>
                OR
                <span className="h-px flex-1 bg-black/10"></span>
              </div>

              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-text px-6 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-brand-text/90"
              >
                Create My Account Free
              </Link>
            </div>
          </div>
        </div>

        {/* Right — lead capture form */}
        <div className="flex items-center bg-brand-bg px-6 py-16 md:px-14 md:py-20">
          <div className="mx-auto w-full max-w-lg rounded-3xl border border-brand-border bg-white p-8 shadow-xl shadow-brand-accent/5 md:p-10">
            {submitted ? (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-green-light text-brand-green">
                  <FaCircleCheck className="text-3xl" />
                </div>
                <h2 className="mt-6 text-2xl font-black tracking-tight text-brand-text">You&apos;re All Set!</h2>
                <p className="mt-3 text-sm leading-relaxed text-brand-muted">
                  Thanks, {form.fullName.split(' ')[0] || 'there'}! We&apos;ve received your product file. Our team
                  will build your free catalog preview and send a live link &amp; QR code to your WhatsApp within
                  24 hours.
                </p>
                <Link
                  href="/signup"
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-accent px-6 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-brand-accent/25 hover:bg-indigo-700"
                >
                  Create My Free Account
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-black tracking-tight text-brand-text">Get Your Free Preview</h2>
                <p className="mt-1.5 text-sm text-brand-muted">Takes less than 2 minutes. No payment, ever.</p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                  <FormField label="Full Name">
                    <input
                      type="text"
                      required
                      value={form.fullName}
                      onChange={(e) => updateField('fullName', e.target.value)}
                      placeholder="Your name"
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Email">
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="you@business.com"
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="WhatsApp Number">
                    <input
                      type="tel"
                      required
                      value={form.whatsappNo}
                      onChange={(e) => updateField('whatsappNo', e.target.value)}
                      placeholder="+91 98765 43210"
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Upload Your Product Excel">
                    <label
                      htmlFor="excelFile"
                      className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-brand-border bg-brand-bg/60 px-4 py-6 text-center transition-colors hover:border-brand-accent hover:bg-brand-accent-light/40"
                    >
                      {file ? (
                        <>
                          <FaFileExcel className="text-2xl text-brand-green" />
                          <span className="text-sm font-semibold text-brand-text">{file.name}</span>
                          <span className="text-xs text-brand-muted">Click to change file</span>
                        </>
                      ) : (
                        <>
                          <FaCloudArrowUp className="text-2xl text-brand-muted" />
                          <span className="text-sm font-semibold text-brand-text">Click to upload Excel or price list</span>
                          <span className="text-xs text-brand-muted">.xlsx or .xls, up to 10MB</span>
                        </>
                      )}
                    </label>
                    <input id="excelFile" type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
                    {fileError && <p className="mt-1.5 text-xs text-red-600">{fileError}</p>}
                  </FormField>

                  <FormField label="Industry">
                    <select
                      required
                      value={form.industry}
                      onChange={(e) => updateField('industry', e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select industry</option>
                      {INDUSTRIES.map((ind) => (
                        <option key={ind} value={ind}>
                          {ind}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="No. of Products">
                    <input
                      type="number"
                      min={1}
                      required
                      value={form.numberOfProducts}
                      onChange={(e) => updateField('numberOfProducts', e.target.value)}
                      placeholder="e.g. 50"
                      className={inputClass}
                    />
                  </FormField>

                  {formError && (
                    <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{formError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-brand-accent py-4 text-sm font-bold uppercase tracking-wider text-white shadow-xl shadow-brand-accent/25 transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? 'Submitting…' : 'Get My Free Catalog Preview'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
