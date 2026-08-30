import Link from 'next/link';
import Layout from '@/components/Layout';

// Kept short and specific to what the product actually does — no
// invented founding history, team size, or funding details that aren't
// real. Mirrors privacy.tsx/terms.tsx's simple content-page pattern.
export default function About() {
  return (
    <Layout
      title="About Us"
      description="Instant Catalog turns your product Excel sheet into a fast, shareable digital catalog — built for manufacturers, wholesalers, and distributors."
    >
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900">About Instant Catalog</h1>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700">
          <section>
            <p>
              Most small and mid-sized businesses still sell from a PDF, a folder of WhatsApp photos, or a print
              catalog that&apos;s out of date the moment a price changes. Instant Catalog exists to fix that: turn
              the product list you already have — an Excel sheet — into a fast, mobile-friendly digital catalog you
              can share with one link, update in seconds, and actually track.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">What We Do</h2>
            <p className="mt-2">
              Upload a spreadsheet, pick a layout, and get a live catalog with a shareable link and QR code —
              usually in minutes, not days. Buyers browse it on any device and send you an enquiry directly; you see
              which products get the most views and interest, and you can update prices or add new items without
              rebuilding or resending anything.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">Who It&apos;s For</h2>
            <p className="mt-2">
              Manufacturers, wholesalers, distributors, and retailers of every kind who currently rely on PDFs,
              printed catalogs, or a generic e-commerce store that&apos;s more than they need. If your business
              sells a product range to other businesses or bulk buyers, Instant Catalog is built for you.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">Get in Touch</h2>
            <p className="mt-2">
              Questions, feedback, or just want to say hello?{' '}
              <Link href="/contact" className="font-medium text-primary-700 hover:text-primary-800">
                Contact us
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
