import Head from 'next/head';
import { useRouter } from 'next/router';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

interface Props {
  title: string;
  description: string;
  // Absolute URL — callers pass one when they have a better image than
  // the site default (a vendor's own catalog banner/logo, a product
  // photo). Falls back to the branded default otherwise.
  image?: string;
  // Pages behind a login wall or otherwise not meant to rank (login,
  // signup, the 404 page) — still crawlable (search engines need to see
  // the noindex directive itself), just excluded from the index.
  noindex?: boolean;
  type?: string;
  // Full canonical URL override — needed on public catalog pages, whose
  // real canonical address may be a vendor's own branded/custom domain
  // rather than this app's own domain that router.asPath would imply.
  canonicalUrl?: string;
}

// Single source of truth for title/description/canonical/OG/Twitter tags
// — every page renders this instead of hand-rolling its own <Head> meta
// block, so the tag set can't drift page to page.
export default function Seo({ title, description, image = DEFAULT_OG_IMAGE, noindex = false, type = 'website', canonicalUrl }: Props) {
  const router = useRouter();
  const canonical = canonicalUrl || `${SITE_URL}${router.asPath.split('?')[0].split('#')[0]}`;

  return (
    <Head>
      <title>{title}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex, follow" />}

      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content="Instant Catalog" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Head>
  );
}

export { SITE_URL, DEFAULT_OG_IMAGE };
