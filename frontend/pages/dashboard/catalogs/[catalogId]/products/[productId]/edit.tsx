import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import Alert from '@/components/Alert';
import ProductForm, { ProductData } from '@/components/dashboard/ProductForm';
import { apiFetch, ApiError } from '@/utils/api';

function EditProduct() {
  const router = useRouter();
  const catalogId = typeof router.query.catalogId === 'string' ? router.query.catalogId : '';
  const productId = typeof router.query.productId === 'string' ? router.query.productId : '';

  const [product, setProduct] = useState<ProductData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!catalogId || !productId) return;
    apiFetch<{ product: ProductData }>(`/products/${productId}`)
      .then((res) => setProduct(res.product))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load product.'));
  }, [catalogId, productId]);

  return (
    <DashboardLayout title="Edit Product">
      <Link
        href={`/dashboard/catalogs/${catalogId}/products`}
        className="text-sm font-medium text-gray-500 hover:text-primary-700"
      >
        ← Back to products
      </Link>
      <h1 className="mt-1 text-3xl font-bold text-gray-900">Edit Product</h1>

      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {product && (
        <div className="mt-6">
          <ProductForm catalogId={catalogId} mode="edit" productId={productId} initial={product} />
        </div>
      )}
    </DashboardLayout>
  );
}

export default withAuth(EditProduct);
