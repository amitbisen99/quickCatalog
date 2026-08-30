import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import DOMPurify from 'dompurify';
import { MinusIcon, PlusIcon } from '@/components/icons';
import type { CatalogTemplateDetailProps } from '@/types/publicCatalog';
import { whatsappLink } from './shared';
import { useEnquiryCart } from './useEnquiryCart';
import EnquiryCartWidget from './EnquiryCartWidget';
import { currencySymbol } from '@/utils/currency';

export default function ModernGridDetail({ catalog, vendor, categories, product }: CatalogTemplateDetailProps) {
  const router = useRouter();
  const symbol = currencySymbol(vendor.currency);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(product.minimumOrderQuantity || 1);
  const cart = useEnquiryCart(catalog.slug);
  const inCart = cart.isInCart(product.id);

  const vendorName = vendor.businessName || catalog.name;
  const categoryName = categories.find((c) => c.id === product.categoryId)?.name;
  const specEntries = product.specifications ? Object.entries(product.specifications) : [];
  const enquiryLink = whatsappLink(
    vendor.countryCode,
    vendor.mobileNo,
    `Hi, I'm interested in "${product.name}" from your ${catalog.name} catalog.`
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          {vendor.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vendor.logo} alt={vendorName} className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            // Default logo until the vendor uploads their own — same mark
            // used as the site favicon, not text initials.
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/icons/icon.svg" alt={vendorName} className="h-10 w-10 rounded-lg" />
          )}
          <span className="text-lg font-bold text-gray-900">{vendorName}</span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-medium text-gray-500 hover:text-primary-700"
        >
          ← Back to {catalog.name}
        </button>

        <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <div className="aspect-square overflow-hidden border border-gray-200 bg-gray-100">
              {product.images.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.images[activeImage]} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">No image</div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="mt-3 flex gap-2">
                {product.images.map((url, i) => (
                  <button
                    key={url}
                    onClick={() => setActiveImage(i)}
                    className={`h-16 w-16 shrink-0 overflow-hidden border-2 ${
                      i === activeImage ? 'border-primary-600' : 'border-transparent'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            {categoryName && (
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">{categoryName}</p>
            )}
            <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">{product.name}</h1>
            <p className="mt-3 text-2xl font-bold text-gray-900">
              {symbol}{product.price}
              <span className="ml-1 text-base font-normal text-gray-500">/ {product.unit || 'pcs'}</span>
              {product.taxPercent ? <span className="ml-2 text-sm font-normal text-gray-400">(+{product.taxPercent}% tax)</span> : null}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Minimum order: {product.minimumOrderQuantity || 1} {product.unit || 'pcs'}
            </p>

            {product.description && (
              <div
                className="prose prose-sm mt-5 max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description) }}
              />
            )}

            {specEntries.length > 0 && (
              <div className="mt-5">
                <p className="text-sm font-medium text-gray-700">Specifications</p>
                <dl className="mt-2 divide-y divide-gray-100 border border-gray-200">
                  {specEntries.map(([key, value]) => (
                    <div key={key} className="flex justify-between px-3 py-2 text-sm">
                      <dt className="text-gray-500">{key}</dt>
                      <dd className="font-medium text-gray-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {product.video && (
              <a
                href={product.video}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block text-sm font-medium text-primary-700 hover:text-primary-800"
              >
                Watch video →
              </a>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 border border-gray-300 px-2 py-1.5">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-6 w-6 items-center justify-center text-gray-500 hover:bg-gray-100"
                >
                  <MinusIcon className="h-3.5 w-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-medium text-gray-900">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="flex h-6 w-6 items-center justify-center text-gray-500 hover:bg-gray-100"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                onClick={() =>
                  cart.addItem(
                    {
                      productId: product.id,
                      name: product.name,
                      price: product.price,
                      taxPercent: product.taxPercent,
                      unit: product.unit,
                      image: product.images[0],
                    },
                    quantity
                  )
                }
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors sm:flex-none ${
                  inCart ? 'bg-primary-100 text-primary-700' : 'bg-primary-700 text-white hover:bg-primary-800'
                }`}
              >
                {inCart ? '✓ Added — add more' : '+ Add to Enquiry'}
              </button>
            </div>

            {enquiryLink && (
              <a
                href={enquiryLink}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
              >
                Or enquire directly on WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      <footer className="mt-6 border-t border-gray-200 bg-white py-8 text-center text-xs text-gray-400">
        {vendor.subscriptionType !== 'paid' ? (
          <>
            Want a digital catalog for your products? Try{' '}
            <Link href="/" target="_blank" className="underline hover:text-primary-700">
              Instant Catalog
            </Link>{' '}
            Free
          </>
        ) : (
          <>
            Powered by{' '}
            <Link href="/" target="_blank" className="underline hover:text-primary-700">
              Instant Catalog
            </Link>
          </>
        )}
      </footer>

      <EnquiryCartWidget catalogId={catalog.id} currency={vendor.currency} cart={cart} />
    </div>
  );
}
