import Link from 'next/link';
import Layout from '@/components/Layout';
import { InstagramIcon, FacebookIcon } from '@/components/icons';

// No public support inbox exists yet — real channels only: the
// in-dashboard Support ticket system (existing vendors) and social
// media (everyone else). Update this if/when a support email address
// is set up.
export default function Contact() {
  return (
    <Layout title="Contact Us" description="Get in touch with the Instant Catalog team.">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900">Contact Us</h1>
        <p className="mt-1.5 text-sm text-gray-500">We&apos;d love to hear from you.</p>

        <div className="mt-8 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">Already a vendor?</h2>
            <p className="mt-2 text-sm text-gray-600">
              The fastest way to reach us is through Support in your dashboard — we can see your account and help
              directly.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800"
            >
              Log in to open Support
            </Link>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">Everyone else</h2>
            <p className="mt-2 text-sm text-gray-600">
              Questions before signing up, feedback, or anything else — reach us on social media and we&apos;ll get
              back to you.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a
                href="https://www.instagram.com/amitbisen1608"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
              >
                <InstagramIcon className="h-5 w-5" />
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61593785046838"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
              >
                <FacebookIcon className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
