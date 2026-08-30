import Link from 'next/link';
import Layout from '@/components/Layout';

export default function Custom404() {
  return (
    <Layout title="Page Not Found" description="This page doesn't exist." noindex>
      <div className="flex flex-1 items-center justify-center px-4 py-24 text-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">404</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Page not found</h1>
          <p className="mt-2 text-sm text-gray-500">The page you&apos;re looking for doesn&apos;t exist or may have moved.</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-800"
          >
            Back to homepage
          </Link>
        </div>
      </div>
    </Layout>
  );
}
