import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import DOMPurify from 'dompurify';
import type { CatalogTemplateProps } from '@/types/publicCatalog';
import { whatsappLink } from './shared';
import { useEnquiryCart } from './useEnquiryCart';
import EnquiryCartWidget from './EnquiryCartWidget';
import CatalogHero from './CatalogHero';
import CatalogFilterBar from './CatalogFilterBar';
import CatalogPagination from './CatalogPagination';
import CatalogFooter from './CatalogFooter';
import WhatsAppFloatButton from './WhatsAppFloatButton';
import { ArrowLeftIcon, ArrowRightIcon } from '@/components/icons';
import { currencySymbol } from '@/utils/currency';
import { playfairDisplay } from '@/utils/fonts';

// One product "spread" per page — full-bleed photo on one side, an
// editorial-style description panel on the other. Same header, search,
// category filter, pagination, and enquiry workflow as Modern Grid; only
// how products themselves are presented differs.
const PAGE_SIZE = 1;

function plainTextOf(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] }).trim();
}

export default function EditorialSpotlightTemplate({ catalog, vendor, categories, products }: CatalogTemplateProps) {
  const symbol = currencySymbol(vendor.currency);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const cart = useEnquiryCart(catalog.slug);
  const spreadRef = useRef<HTMLDivElement>(null);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter && p.categoryId !== categoryFilter) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, search, categoryFilter]);

  const totalPages = Math.max(Math.ceil(filteredProducts.length / PAGE_SIZE), 1);
  const product = filteredProducts[(page - 1) * PAGE_SIZE];
  const inCart = product ? cart.isInCart(product.id) : false;

  function goToPage(next: number) {
    setPage(next);
    // Scroll to the product spread itself, not all the way up to the
    // header — scroll-mt-20 on the spread (below) keeps it clear of the
    // sticky filter bar.
    spreadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const categoryName = (id?: string) => categories.find((c) => c.id === id)?.name;
  const vendorName = vendor.businessName || catalog.name;

  const generalWhatsapp = whatsappLink(vendor.mobileNo, `Hi, I'd like to know more about your "${catalog.name}" catalog.`);
  const productWhatsapp = product
    ? whatsappLink(vendor.mobileNo, `Hi, I'm interested in "${product.name}" from your ${catalog.name} catalog.`)
    : '';

  return (
    <div className="min-h-screen bg-gray-50">
      <CatalogHero catalog={catalog} vendor={vendor} productsCount={products.length} theme="light" />

      <CatalogFilterBar
        categories={categories}
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        categoryFilter={categoryFilter}
        onCategoryChange={(value) => {
          setCategoryFilter(value);
          setPage(1);
        }}
      />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {products.length === 0 ? (
          <div className="mt-6 border border-gray-200 bg-white p-14 text-center shadow-sm">
            <p className="text-sm font-medium text-gray-900">No products yet</p>
            <p className="mt-1 text-sm text-gray-500">This catalog doesn&apos;t have any products listed yet.</p>
          </div>
        ) : !product ? (
          <div className="mt-6 border border-gray-200 bg-white p-14 text-center shadow-sm">
            <p className="text-sm font-medium text-gray-900">No matching products</p>
            <p className="mt-1 text-sm text-gray-500">Try a different search or category.</p>
          </div>
        ) : (
          <div
            ref={spreadRef}
            className="relative flex scroll-mt-20 flex-col overflow-hidden bg-[#1B2E22] shadow-lg xl:flex-row xl:justify-center"
          >
            {/* Previous/next apply to the whole card (not just the photo)
                — anchored to this outer container so they sit at its true
                left/right edges on every breakpoint. */}
            {page > 1 && (
              <button
                onClick={() => goToPage(page - 1)}
                aria-label="Previous product"
                className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-black/70 sm:h-14 sm:w-14"
              >
                <ArrowLeftIcon className="h-6 w-6 sm:h-7 sm:w-7" />
              </button>
            )}
            {page < totalPages && (
              <button
                onClick={() => goToPage(page + 1)}
                aria-label="Next product"
                className="absolute right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-black/70 sm:h-14 sm:w-14"
              >
                <ArrowRightIcon className="h-6 w-6 sm:h-7 sm:w-7" />
              </button>
            )}

            {/* Fixed 552x552 on desktop (matches this max-w-6xl container's
                content width exactly at the xl breakpoint) — fluid squares
                below that so it never overflows a narrower viewport. */}
            <div className="relative aspect-square w-full shrink-0 bg-[#12201A] xl:aspect-auto xl:h-[552px] xl:w-[552px]">
              {product.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-[#C9D3C6]">No image</div>
              )}
            </div>

            <div className="flex w-full flex-col justify-center px-8 py-12 sm:px-12 xl:h-[552px] xl:w-[552px] xl:px-14">
              {categoryName(product.categoryId) && (
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C7A857]">
                  {categoryName(product.categoryId)}
                </p>
              )}
              <h2 className={`${playfairDisplay.className} mt-3 text-3xl text-[#F4EFE3] sm:text-4xl`}>{product.name}</h2>

              {product.description && (
                <p className="mt-5 line-clamp-4 text-sm leading-relaxed text-[#C9D3C6] sm:text-base">
                  {plainTextOf(product.description)}
                </p>
              )}

              <p className="mt-6 text-lg font-semibold text-[#F4EFE3]">
                {symbol}
                {product.price}
                <span className="ml-1 text-sm font-normal text-[#C9D3C6]">/ {product.unit || 'pcs'}</span>
                {product.taxPercent ? <span className="ml-2 text-xs font-normal text-[#C9D3C6]">(+{product.taxPercent}% tax)</span> : null}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  onClick={() =>
                    inCart
                      ? cart.removeItem(product.id)
                      : cart.addItem({
                          productId: product.id,
                          name: product.name,
                          price: product.price,
                          taxPercent: product.taxPercent,
                          unit: product.unit,
                          image: product.images[0],
                        })
                  }
                  className={`border px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] transition-colors ${
                    inCart
                      ? 'border-[#C7A857] bg-[#C7A857] text-[#1B2E22]'
                      : 'border-[#C7A857] text-[#C7A857] hover:bg-[#C7A857] hover:text-[#1B2E22]'
                  }`}
                >
                  {inCart ? 'Added' : 'Enquire'}
                </button>
                <Link
                  href={`/public/${catalog.slug}/products/${product.id}`}
                  className="text-xs font-medium uppercase tracking-wide text-[#C9D3C6] underline decoration-[#C9D3C6]/40 underline-offset-4 hover:text-[#F4EFE3]"
                >
                  View full details →
                </Link>
              </div>
            </div>
          </div>
        )}

        <CatalogPagination page={page} totalPages={totalPages} onPageChange={goToPage} />
      </div>

      <CatalogFooter vendorName={vendorName} mobileNo={vendor.mobileNo} />
      <WhatsAppFloatButton link={productWhatsapp || generalWhatsapp} />
      <EnquiryCartWidget catalogId={catalog.id} currency={vendor.currency} cart={cart} />
    </div>
  );
}
