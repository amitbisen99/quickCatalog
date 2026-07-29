import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import ProductForm from '@/components/dashboard/ProductForm';

function CreateStandaloneProduct() {
  return (
    <DashboardLayout title="Add Product">
      <Link href="/dashboard/products" className="text-sm font-medium text-gray-500 hover:text-primary-700">
        ← Back to products
      </Link>
      <h1 className="mt-1 text-3xl font-bold text-gray-900">Add Product</h1>
      <p className="mt-1 text-sm text-gray-500">
        This product is added to your library and can be included in any catalog afterwards.
      </p>

      <div className="mt-6">
        <ProductForm mode="create" />
      </div>
    </DashboardLayout>
  );
}

export default withAuth(CreateStandaloneProduct);
