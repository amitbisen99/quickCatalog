import type { GetServerSideProps } from 'next';
import { absoluteApiUrl } from '@/utils/api';
import { getCatalogTemplate } from '@/components/catalog-templates/registry';
import { useTrackVisit } from '@/utils/analytics';
import Seo from '@/components/Seo';
import type { CatalogProductPageData } from '@/types/publicCatalog';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010';

interface Props {
  data: CatalogProductPageData | null;
  error: string;
}

// Server-rendered for the same reason as the catalog listing page
// (pages/public/[slug]/index.tsx) — this used to be a client-side
// useEffect fetch, which meant its title/description/OG tags (and the
// JSON-LD below) never existed in the HTML a link-preview crawler
// actually fetches, only after JS ran.
export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => {
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const productSlug = typeof params?.productSlug === 'string' ? params.productSlug : '';
  try {
    const res = await fetch(absoluteApiUrl(`/public/catalog/${slug}/products/${productSlug}`));
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { props: { data: null, error: body.message || 'Could not load this product.' } };
    }
    return { props: { data: body as CatalogProductPageData, error: '' } };
  } catch {
    return { props: { data: null, error: 'Could not load this product.' } };
  }
};

export default function PublicCatalogProduct({ data, error }: Props) {
  useTrackVisit(data?.catalog.slug, data?.product.id);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">Product not found</p>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const { detailComponent: DetailTemplate } = getCatalogTemplate(data.catalog.template);
  const vendorName = data.vendor.businessName || data.catalog.name;
  const pageTitle = `${data.product.name} — ${vendorName}`;
  const pageDescription = data.product.description || `${data.product.name}, from ${vendorName}'s catalog on Instant Catalog.`;
  const pageUrl = `${APP_URL}/public/${data.catalog.slug}/products/${data.product.slug}`;
  const ogImage = data.product.images.length
    ? absoluteApiUrl(`/public/catalog/${data.catalog.slug}/products/${data.product.slug}/og-image`)
    : undefined;

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: data.product.name,
    description: data.product.description || undefined,
    image: data.product.images[0] ? [ogImage] : undefined,
    offers: {
      '@type': 'Offer',
      price: String(data.product.price),
      priceCurrency: data.vendor.currency || 'INR',
      availability: 'https://schema.org/InStock',
      url: pageUrl,
    },
  };

  return (
    <>
      <Seo title={pageTitle} description={pageDescription} image={ogImage} canonicalUrl={pageUrl} type="product" />
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <DetailTemplate {...data} />
    </>
  );
}
