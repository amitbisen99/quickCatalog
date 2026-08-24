import { useMemo } from 'react';
import Link from 'next/link';
import type { CatalogTemplateProps } from '@/types/publicCatalog';
import { whatsappLink } from './shared';
import { useEnquiryCart } from './useEnquiryCart';
import { useCatalogListState } from './useCatalogListState';
import EnquiryCartWidget from './EnquiryCartWidget';
import CatalogHero from './CatalogHero';
import CatalogFilterBar from './CatalogFilterBar';
import CatalogPagination from './CatalogPagination';
import CatalogFooter from './CatalogFooter';
import WhatsAppFloatButton from './WhatsAppFloatButton';
import { currencySymbol } from '@/utils/currency';

const PAGE_SIZE = 12; // 3 rows of 4 on desktop

export default function ModernGridTemplate({ catalog, vendor, categories, products }: CatalogTemplateProps) {
  const symbol = currencySymbol(vendor.currency);
  const { search, categoryFilter, page, setPage, updateSearch, updateCategoryFilter } = useCatalogListState();
  const cart = useEnquiryCart(catalog.slug);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter && p.categoryId !== categoryFilter) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, search, categoryFilter]);

  const totalPages = Math.max(Math.ceil(filteredProducts.length / PAGE_SIZE), 1);
  const pagedProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function goToPage(next: number) {
    setPage(next);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const categoryName = (id?: string) => categories.find((c) => c.id === id)?.name;
  const vendorName = vendor.businessName || catalog.name;

  const generalWhatsapp = whatsappLink(
    vendor.countryCode,
    vendor.mobileNo,
    `Hi, I'd like to know more about your "${catalog.name}" catalog.`
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <CatalogHero catalog={catalog} vendor={vendor} productsCount={products.length} />

      <CatalogFilterBar
        categories={categories}
        search={search}
        onSearchChange={updateSearch}
        categoryFilter={categoryFilter}
        onCategoryChange={updateCategoryFilter}
      />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {products.length === 0 ? (
          <div className="mt-6 border border-gray-200 bg-white p-14 text-center shadow-sm">
            <p className="text-sm font-medium text-gray-900">No products yet</p>
            <p className="mt-1 text-sm text-gray-500">This catalog doesn&apos;t have any products listed yet.</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="mt-6 border border-gray-200 bg-white p-14 text-center shadow-sm">
            <p className="text-sm font-medium text-gray-900">No matching products</p>
            <p className="mt-1 text-sm text-gray-500">Try a different search or category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {pagedProducts.map((product) => {
              const inCart = cart.isInCart(product.id);
              return (
                <div
                  key={product.id}
                  className="group flex flex-col overflow-hidden border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-lg"
                >
                  <Link href={`/public/${catalog.slug}/products/${product.slug}`} className="contents">
                    <div className="relative aspect-square overflow-hidden bg-gray-100">
                      {product.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-gray-400">No image</div>
                      )}
                      {(product.minimumOrderQuantity || 1) > 1 && (
                        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-gray-700 shadow-sm backdrop-blur">
                          MOQ {product.minimumOrderQuantity}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 px-3 pt-3">
                      {categoryName(product.categoryId) && (
                        <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-primary-600">
                          {categoryName(product.categoryId)}
                        </p>
                      )}
                      <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-gray-900">{product.name}</p>
                      <p className="mt-1.5 text-sm font-bold text-gray-900">
                        {symbol}{product.price}
                        <span className="ml-1 text-xs font-normal text-gray-400">/ {product.unit || 'pcs'}</span>
                      </p>
                      {product.taxPercent ? (
                        <p className="text-[10px] text-gray-400">+{product.taxPercent}% tax</p>
                      ) : null}
                    </div>
                  </Link>
                  <div className="flex justify-center p-3 pt-2">
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
                      className={`px-3.5 py-1.5 text-xs font-medium transition-colors hover:bg-secondary-500 hover:text-primary-950 ${
                        inCart ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {inCart ? '✓ Added to Enquiry' : '+ Add to Enquiry'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <CatalogPagination page={page} totalPages={totalPages} onPageChange={goToPage} />
      </div>

      <CatalogFooter vendorName={vendorName} mobileNo={vendor.mobileNo} countryCode={vendor.countryCode} />
      <WhatsAppFloatButton link={generalWhatsapp} />
      <EnquiryCartWidget catalogId={catalog.id} currency={vendor.currency} cart={cart} />
    </div>
  );
}
