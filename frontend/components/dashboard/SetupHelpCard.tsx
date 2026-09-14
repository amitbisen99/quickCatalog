import { ChangeEvent, useState } from 'react';
import Modal from '@/components/Modal';
import Alert from '@/components/Alert';
import { UploadIcon, CheckCircleIcon } from '@/components/icons';
import { apiFetch, ApiError } from '@/utils/api';

const MAX_EXCEL_SIZE = 10 * 1024 * 1024; // 10MB — matches backend's excelUpload limit

// "Don't Have Time to Build It? We'll Do It For You" — a plan-agnostic
// onboarding nudge shown just above the Subscription card
// (pages/dashboard/index.tsx), hidden once a vendor is on the Paid plan
// (they can already publish on their own). Deliberately asks for nothing
// but the Excel file: the vendor is already signed in, so name/email/
// WhatsApp/industry are filled in server-side from their own account
// (see backend's submitSetupHelpRequest) instead of asking again. Same
// underlying model/admin panel as the public "Free Catalog Preview"
// landing page (pages/catalog-preview.tsx, /admin/catalog-preview-leads),
// tagged source: 'vendor_dashboard' there.
export default function SetupHelpCard() {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [uploading, setUploading] = useState(false);
  // Kept true after a successful upload rather than hiding the card —
  // the vendor may need to send an updated/corrected sheet later, so the
  // upload control stays available alongside the success message.
  const [lastUploadedName, setLastUploadedName] = useState('');
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] || null;
    setFileError('');
    setSubmitError('');
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

  async function handleUpload() {
    if (!file) {
      setFileError('Please attach your product Excel or price list.');
      return;
    }
    setSubmitError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await apiFetch('/catalog-preview-leads', { method: 'POST', formData });
      setLastUploadedName(file.name);
      setFile(null);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not send your file. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🎁</span>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Don&apos;t Have Time to Build It? We&apos;ll Do It For You.</h2>
          <p className="mt-1 text-sm text-gray-500">
            Send us your product Excel file and our team will set it up, format it, and publish your first catalog
            for you — free.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <Alert variant="info">Free setup assistance. Subscription required to publish your catalog.</Alert>
      </div>

      {lastUploadedName && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
          <p className="text-sm text-green-800">
            <strong>{lastUploadedName}</strong> was sent to our team. We&apos;ll reach out on your WhatsApp/email
            within 24 hours. Need to send an updated sheet? Just upload it below.
          </p>
        </div>
      )}

      {submitError && (
        <div className="mt-4">
          <Alert variant="error">{submitError}</Alert>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
        <div>
          <label
            htmlFor="setupHelpExcel"
            className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center transition-colors hover:border-primary-500 hover:bg-primary-50/40"
          >
            {file ? (
              <>
                <UploadIcon className="h-6 w-6 text-primary-600" />
                <span className="text-sm font-semibold text-gray-900">{file.name}</span>
                <span className="text-xs text-gray-500">Click to change file</span>
              </>
            ) : (
              <>
                <UploadIcon className="h-6 w-6 text-gray-400" />
                <span className="text-sm font-semibold text-gray-900">Click to upload Excel or price list</span>
                <span className="text-xs text-gray-500">.xlsx or .xls, up to 10MB</span>
              </>
            )}
          </label>
          <input
            id="setupHelpExcel"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          {fileError && <p className="mt-1.5 text-xs text-red-600">{fileError}</p>}
          <p className="mt-2 text-xs text-gray-500">
            🔒 Private preview · 10–20 products is enough · No confidential data required.{' '}
            <button
              type="button"
              onClick={() => setPrivacyModalOpen(true)}
              className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700"
            >
              Read more
            </button>
          </p>
        </div>

        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading || !file}
          className="rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-0"
        >
          {uploading ? 'Sending…' : 'Send to Our Team'}
        </button>
      </div>

      <Modal
        isOpen={privacyModalOpen}
        onClose={() => setPrivacyModalOpen(false)}
        title="🔒 Your Product Data Stays in Your Control"
      >
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            We use your uploaded product information only to create your private catalog preview. Your preview
            isn&apos;t published publicly, and we don&apos;t sell or share your product data for unrelated purposes.
          </p>
          <p>
            You don&apos;t need to upload your entire Excel. Start with just 10–20 products. You can also remove
            prices, supplier costs, margins or any other confidential information you&apos;re not comfortable
            sharing.
          </p>
        </div>
      </Modal>
    </div>
  );
}
