import type { GetServerSideProps } from 'next';
import { absoluteApiUrl } from '@/utils/api';
import { SITE_URL } from '@/components/Seo';

// Static marketing pages worth listing — dashboard/admin/auth pages are
// deliberately excluded (private, transactional, or noindex'd).
const STATIC_PATHS = ['', '/about', '/contact', '/privacy', '/terms', '/catalog-preview'];

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildSitemap(catalogs: { slug: string; updatedAt: string }[]): string {
  const staticUrls = STATIC_PATHS.map((path) => `<url><loc>${SITE_URL}${path}</loc></url>`).join('');
  const catalogUrls = catalogs
    .map(
      (c) =>
        `<url><loc>${escapeXml(`${SITE_URL}/public/${c.slug}`)}</loc><lastmod>${new Date(c.updatedAt).toISOString()}</lastmod><changefreq>weekly</changefreq></url>`
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticUrls}${catalogUrls}</urlset>`;
}

// A page component with no default export body — this route exists only
// for its getServerSideProps, which writes raw XML straight to the
// response and ends it before Next ever renders anything.
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  let catalogs: { slug: string; updatedAt: string }[] = [];
  try {
    const apiRes = await fetch(absoluteApiUrl('/public/sitemap-catalogs'));
    const body = await apiRes.json().catch(() => ({}));
    if (apiRes.ok && Array.isArray(body.catalogs)) {
      catalogs = body.catalogs;
    }
  } catch {
    // Fall back to just the static pages rather than 500ing the whole
    // sitemap if the API is briefly unreachable.
  }

  res.setHeader('Content-Type', 'text/xml');
  res.write(buildSitemap(catalogs));
  res.end();

  return { props: {} };
};

export default function Sitemap() {
  return null;
}
