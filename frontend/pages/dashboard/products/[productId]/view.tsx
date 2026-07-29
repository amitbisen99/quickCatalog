import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import DOMPurify from 'dompurify';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import Alert from '@/components/Alert';
import { PencilIcon } from '@/components/icons';
import { apiFetch, ApiError } from '@/utils/api';
import { currencySymbol } from '@/utils/currency';
import { useAuth } from '@/context/AuthContext';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  taxPercent?: number;
  unit?: string;
  minimumOrderQuantity?: number;
  categoryId?: string;
  video?: string;
  images: string[];
  catalogIds: string[];
  specifications?: Record<string, string>;
}

function ViewProduct() {
  const router = useRouter();
  const { user } = useAuth();
  const symbol = currencySymbol(user?.currency);
  const productId = typeof router.query.productId === 'string' ? router.query.productId : '';

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!productId) return;
    apiFetch<{ product: Product }>(`/products/${productId}`)
      .then((res) => setProduct(res.product))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load product.'));
    apiFetch<{ categories: Category[] }>('/categories').then((res) => setCategories(res.categories));
  }, [productId]);

  const categoryName = categories.find((c) => c.id === product?.categoryId)?.name;
  const specEntries = product?.specifications ? Object.entries(product.specifications) : [];

  return (
    <DashboardLayout title="Product">
      <Link href="/dashboard/products" className="text-sm font-medium text-gray-500 hover:text-primary-700">
        ← Back to products
      </Link>

      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {product && (
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
              <Link
                href={`/dashboard/products/${product.id}/edit`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <PencilIcon className="h-4 w-4" />
                Edit
              </Link>
            </div>

            <div className="mt-4 flex gap-3">
              {product.images.length === 0 && (
                <div className="flex h-32 w-32 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-xs text-gray-400">
                  No image
                </div>
              )}
              {product.images.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt="" className="h-32 w-32 rounded-xl border border-gray-200 object-cover" />
              ))}
            </div>

            {product.description && (
              <div
                className="prose prose-sm mt-4 max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description) }}
              />
            )}

            {specEntries.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-700">Specifications</p>
                <dl className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200">
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
              <p className="mt-4 text-sm">
                <a href={product.video} target="_blank" rel="noreferrer" className="font-medium text-primary-700 hover:text-primary-800">
                  View video →
                </a>
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Price</dt>
                <dd className="font-medium text-gray-900">
                  {symbol}{product.price} / {product.unit || 'pcs'}
                  {product.taxPercent ? <span className="ml-1 text-xs font-normal text-gray-400">(+{product.taxPercent}% tax)</span> : null}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Minimum Order Qty</dt>
                <dd className="font-medium text-gray-900">{product.minimumOrderQuantity || 1}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Category</dt>
                <dd className="font-medium text-gray-900">{categoryName || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Used in catalogs</dt>
                <dd className="font-medium text-gray-900">{product.catalogIds.length}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default withAuth(ViewProduct);
