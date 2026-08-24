import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { absoluteApiUrl } from '@/utils/api';
import { getCatalogTemplate } from '@/components/catalog-templates/registry';
import { useTrackVisit } from '@/utils/analytics';
import type { CatalogPageData } from '@/types/publicCatalog';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010';

interface Props {
  data: CatalogPageData | null;
  error: string;
}

// Server-rendered rather than the client-side useEffect fetch this page
// used to do — link-preview crawlers (WhatsApp, Facebook, etc.) fetch the
// raw HTML and never run JavaScript, so any data (and the Open Graph tags
// built from it) that only appeared after a client fetch would be
// completely invisible to them. This runs the same fetch server-side
// instead, so the tags are already in the HTML by the time it's sent.
export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => {
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  try {
    const res = await fetch(absoluteApiUrl(`/public/catalog/${slug}`));
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { props: { data: null, error: body.message || 'Could not load this catalog.' } };
    }
    return { props: { data: body as CatalogPageData, error: '' } };
  } catch {
    return { props: { data: null, error: 'Could not load this catalog.' } };
  }
};

export default function PublicCatalog({ data, error }: Props) {
  // Client-side only (useTrackVisit's effect never runs during SSR) —
  // this page is server-rendered for crawlers/link previews, but a
  // visit should count once per real browser load, not once per server
  // render (which would also fire for bots/crawlers hitting SSR directly).
  useTrackVisit(data?.catalog.slug);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">Catalog not found</p>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  // The page's only job is fetching data and picking the right template —
  // every visual decision lives in the template component itself, so
  // adding a 2nd/3rd/4th template never touches this file.
  const { component: Template } = getCatalogTemplate(data.catalog.template);
  const vendorName = data.vendor.businessName || data.catalog.name;
  const pageTitle = `${data.catalog.name} — ${vendorName}`;
  const pageDescription =
    data.catalog.description || `Browse ${vendorName}'s product catalog on Instant Catalog.`;
  const pageUrl = `${APP_URL}/public/${data.catalog.slug}`;
  // Only set og:image when there's actually a banner/logo to serve —
  // the endpoint 404s otherwise, which crawlers handle fine, but there's
  // no reason to point at a URL we already know is empty.
  const ogImage = data.vendor.banner || data.vendor.logo ? absoluteApiUrl(`/public/catalog/${data.catalog.slug}/og-image`) : null;

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={pageUrl} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
      </Head>
      <Template {...data} />
    </>
  );
}
