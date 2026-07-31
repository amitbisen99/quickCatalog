import Link from 'next/link';
import Layout from '@/components/Layout';

// Placeholder marketing homepage — real site content/design arrives
// separately. This just gives the root domain a presentable landing spot
// and a way into the vendor panel.
export default function Home() {
  return (
    <Layout title="Home">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
          Build and share your product catalog in minutes
        </h1>
        <p className="mt-4 text-gray-600">
          QuickCatalog helps vendors create beautiful product catalogs, share
          them with a link or QR code, and collect enquiries — all in one
          place. Full site coming soon.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-800"
        >
          Vendor Login
        </Link>
      </div>
    </Layout>
  );
}
