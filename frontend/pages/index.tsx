import Layout from '@/components/Layout';

export default function Home() {
  return (
    <Layout title="Home">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
          Build and share your product catalog in minutes
        </h1>
        <p className="mt-4 text-gray-600">
          QuickCatalog scaffolding is up — PWA, Tailwind, and the base layout
          are wired in. Auth, dashboard, and public catalog pages arrive in
          the next phases.
        </p>
      </div>
    </Layout>
  );
}
