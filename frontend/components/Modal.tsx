import { ReactNode } from 'react';
import { XIcon } from '@/components/icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  // Every existing modal is fine at the default width — only opt into a
  // wider one (e.g. a feature list with a lot to show) via this.
  maxWidthClassName?: string;
}

export default function Modal({ isOpen, onClose, title, children, maxWidthClassName = 'max-w-lg' }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* max-h + flex-col so content taller than the viewport (long
          checklists, etc.) scrolls inside the card instead of pushing the
          card itself past the screen edges — without this, tall content on
          a short mobile viewport made the whole modal look like it was
          "covering the screen" with no visible rounded corners or footer. */}
      <div className={`relative flex max-h-[90vh] w-full ${maxWidthClassName} flex-col rounded-2xl bg-white shadow-xl`}>
        <div className="flex shrink-0 items-center justify-between px-6 pb-4 pt-6">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}
