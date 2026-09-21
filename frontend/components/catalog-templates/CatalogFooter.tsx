import { catalogFooterUrl } from '@/utils/attribution';

interface Props {
  vendorName: string;
  mobileNo?: string;
  countryCode?: string;
  subscriptionType?: string;
}

// The footer every catalog template shares — kept in one place so
// switching templates never changes this part of the page.
export default function CatalogFooter({ vendorName, mobileNo, countryCode, subscriptionType }: Props) {
  const isFree = subscriptionType !== 'paid';

  return (
    <footer className="border-t border-gray-200 bg-white py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center sm:px-6">
        <p className="text-sm font-semibold text-gray-700">{vendorName}</p>
        {mobileNo && (
          <p className="text-xs text-gray-500">
            {countryCode} {mobileNo}
          </p>
        )}
        {isFree ? (
          <p className="mt-2 text-xs text-gray-400">
            Want a digital catalog for your products? Try{' '}
            <a href={catalogFooterUrl(false)} target="_blank" rel="noopener" className="underline hover:text-primary-700">
              Instant Catalog
            </a>{' '}
            Free
          </p>
        ) : (
          <p className="mt-2 text-xs text-gray-400">
            Powered by{' '}
            <a href={catalogFooterUrl(true)} target="_blank" rel="noopener" className="underline hover:text-primary-700">
              Instant Catalog
            </a>
          </p>
        )}
      </div>
    </footer>
  );
}
