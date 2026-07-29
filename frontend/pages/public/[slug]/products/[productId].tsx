import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { apiFetch, ApiError } from '@/utils/api';
import { getCatalogTemplate } from '@/components/catalog-templates/registry';
import type { CatalogProductPageData } from '@/types/publicCatalog';

export default function PublicCatalogProduct() {
  const router = useRouter();
  const slug = typeof router.query.slug === 'string' ? router.query.slug : '';
  const productId = typeof router.query.productId === 'string' ? router.query.productId : '';

  const [data, setData] = useState<CatalogProductPageData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug || !productId) return;
    apiFetch<CatalogProductPageData>(`/public/catalog/${slug}/products/${productId}`)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load this product.'));
  }, [slug, productId]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">Product not found</p>
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

  const { detailComponent: DetailTemplate } = getCatalogTemplate(data.catalog.template);
  const vendorName = data.vendor.businessName || data.catalog.name;

  return (
    <>
      <Head>
        <title>{`${data.product.name} — ${vendorName}`}</title>
        {data.product.description && <meta name="description" content={data.product.description} />}
      </Head>
      <DetailTemplate {...data} />
    </>
  );
}
