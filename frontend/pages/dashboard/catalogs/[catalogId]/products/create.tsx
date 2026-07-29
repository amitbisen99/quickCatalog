import { useRouter } from 'next/router';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import ProductForm from '@/components/dashboard/ProductForm';

function CreateProduct() {
  const router = useRouter();
  const catalogId = typeof router.query.catalogId === 'string' ? router.query.catalogId : '';

  return (
    <DashboardLayout title="Add Product">
      <Link
        href={`/dashboard/catalogs/${catalogId}/products`}
        className="text-sm font-medium text-gray-500 hover:text-primary-700"
      >
        ← Back to products
      </Link>
      <h1 className="mt-1 text-3xl font-bold text-gray-900">Add Product</h1>

      {catalogId && (
        <div className="mt-6">
          <ProductForm catalogId={catalogId} mode="create" />
        </div>
      )}
    </DashboardLayout>
  );
}

export default withAuth(CreateProduct);
