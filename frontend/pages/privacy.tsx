import Link from 'next/link';
import Layout from '@/components/Layout';

// Kept deliberately short and specific to what this app actually does —
// no boilerplate about things Instant Catalog doesn't do (ad networks,
// third-party trackers, data brokers, etc.). Update this alongside any
// change to what data gets collected or which third-party processors
// are in use (currently: Razorpay for payments, Brevo for email).
export default function Privacy() {
  return (
    <Layout title="Privacy Policy">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mt-1 text-sm text-gray-500">Last updated: August 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700">
          <section>
            <p>
              Instant Catalog (&ldquo;we&rdquo;, &ldquo;us&rdquo;) provides a platform for businesses (&ldquo;vendors&rdquo;,
              &ldquo;you&rdquo;) to build and share digital product catalogs. This page explains what data we collect,
              why, and how it&apos;s handled — for both vendors using the platform and the customers who browse a
              vendor&apos;s public catalog.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">1. What We Collect</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li><strong>Account details</strong> — email, mobile number, business name, business type, and industry, provided at signup.</li>
              <li><strong>Catalog content</strong> — product names, prices, descriptions, specifications, and images you upload.</li>
              <li><strong>Buyer enquiries</strong> — when someone submits an enquiry on your public catalog, we collect the name, mobile number, and (optional) email they provide, and pass it to you as the vendor.</li>
              <li><strong>Usage analytics</strong> — an anonymous visitor identifier and device type (mobile/desktop) per catalog view, used only to show you view/enquiry counts. We do not collect or store IP addresses or precise location.</li>
              <li><strong>Payment info</strong> — if you upgrade to Premium, payment is processed directly by Razorpay. We never receive or store your card, UPI, or bank details.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">2. How We Use It</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>To create and operate your account and catalogs.</li>
              <li>To send account emails — signup verification, password resets, enquiry notifications — via our email provider, Brevo.</li>
              <li>To show you enquiry and view analytics for your own catalogs.</li>
              <li>To process a Premium upgrade via Razorpay, if you choose to upgrade.</li>
              <li>To respond to support requests you send us.</li>
            </ul>
            <p className="mt-2">We don&apos;t sell your data, and we don&apos;t use it for advertising.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">3. Third Parties We Use</h2>
            <p className="mt-2">
              We rely on a small number of processors to run the service: <strong>Razorpay</strong> for payments and
              <strong> Brevo</strong> for transactional email. Each only receives the data needed to do its job (e.g.
              Razorpay handles your payment directly; we only learn whether it succeeded).
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">4. Security</h2>
            <p className="mt-2">
              Passwords are hashed, never stored in plain text. Sessions use secure, HTTP-only cookies. Access to your
              account data is restricted to your login.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">5. Cookies</h2>
            <p className="mt-2">
              We use cookies only to keep you signed in — no third-party advertising or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">6. Your Data, Your Choice</h2>
            <p className="mt-2">
              You can update your profile and catalog content anytime from your dashboard. To request deletion of
              your account and associated data, contact us through the Support page in your dashboard — we&apos;ll
              action it manually and confirm once it&apos;s done.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">7. Children</h2>
            <p className="mt-2">Instant Catalog is intended for business use and isn&apos;t directed at anyone under 18.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">8. Changes</h2>
            <p className="mt-2">
              If we make a material change to this policy, we&apos;ll update the date at the top of this page.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">9. Contact</h2>
            <p className="mt-2">
              Questions about this policy? Reach us through the Support page in your dashboard, or by replying to any
              email you&apos;ve received from us.{' '}
              <Link href="/login" className="font-medium text-primary-700 hover:text-primary-800">
                Log in
              </Link>{' '}
              to open Support.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
