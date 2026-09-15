import { useState } from 'react';
import Modal from '@/components/Modal';
import { InfoIcon, GridIcon, BoxIcon } from '@/components/icons';

// Shared by both Excel-upload wizards — dashboard/catalogs/create.tsx and
// dashboard/products/bulk-import.tsx — since the same file/image rules
// apply to both. Used to be a big always-visible two-column block on each
// page; now a single line with an info icon that opens the same rules in
// a popup, so the upload step reads less cluttered at a glance.
export default function FileRequirementsInfo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500 hover:text-primary-700"
      >
        <InfoIcon className="h-4 w-4" />
        File Requirements — Read Before Uploading
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="File Requirements" maxWidthClassName="max-w-3xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
                  The <strong className="text-gray-900">first row</strong> must be column headers — data starts on
                  row 2
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
                  Optional columns: Description, Category, Unit, Specifications, Image URL, Image Filename, Video
                  URL
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[11px] font-bold text-primary-700">
                  6
                </span>
                <span>
                  Prices should be plain numbers (e.g.{' '}
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">499</code>, not{' '}
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">$499.00</code>)
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[11px] font-bold text-primary-700">
                  7
                </span>
                <span>
                  Specifications go in one column as{' '}
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">Key: Value</code> pairs
                  separated by semicolons, e.g.{' '}
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">Color: Red; Size: Large</code>
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
                  photo (e.g. <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">rug-5x7.jpg</code>)
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
      </Modal>
    </>
  );
}
