import { useAuth } from '@/context/AuthContext';
import { XIcon } from '@/components/icons';
import ShareOptions from './ShareOptions';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010';

interface Props {
  catalog: { name: string; slug: string } | null;
  onClose: () => void;
}

// Bottom sheet on mobile (slides up, rounded top corners — matches the
// Upload-photo picker and the dashboard's "More" nav sheet), a centered
// modal on desktop. Used from the catalogs list page's per-row Share
// button.
export default function ShareCatalogModal({ catalog, onClose }: Props) {
  const { user } = useAuth();
  if (!catalog) return null;

  const url = `${APP_URL}/public/${catalog.slug}`;
  const businessName = user?.businessName || 'Our Business';
  const message = `${businessName} — Product Catalog\nExplore our full range: ${catalog.name}\n${url}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:max-w-md sm:rounded-2xl">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-200 sm:hidden" />
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-base font-semibold text-gray-900">Share Catalog</p>
            <p className="truncate text-xs text-gray-500">{catalog.name}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 truncate rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">{url}</p>

        <div className="mt-5">
          <ShareOptions url={url} message={message} subject={catalog.name} />
        </div>
      </div>
    </div>
  );
}
