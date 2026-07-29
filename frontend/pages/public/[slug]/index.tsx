import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { apiFetch, ApiError } from '@/utils/api';
import { getCatalogTemplate } from '@/components/catalog-templates/registry';
import type { CatalogPageData } from '@/types/publicCatalog';

export default function PublicCatalog() {
  const router = useRouter();
  const slug = typeof router.query.slug === 'string' ? router.query.slug : '';

  const [data, setData] = useState<CatalogPageData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    apiFetch<CatalogPageData>(`/public/catalog/${slug}`)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load this catalog.'));
  }, [slug]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">Catalog not found</p>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  // The page's only job is fetching data and picking the right template —
  // every visual decision lives in the template component itself, so
  // adding a 2nd/3rd/4th template never touches this file.
  const { component: Template } = getCatalogTemplate(data.catalog.template);
  const vendorName = data.vendor.businessName || data.catalog.name;

  return (
    <>
      <Head>
        <title>{`${data.catalog.name} — ${vendorName}`}</title>
        {data.catalog.description && <meta name="description" content={data.catalog.description} />}
      </Head>
      <Template {...data} />
    </>
  );
}
