import Link from 'next/link';
import Layout from '@/components/Layout';

// Adapted from a reference policy the user supplied — not used verbatim.
// The reference assumed a typical auto-renewing SaaS subscription
// (monthly/quarterly/yearly, auto-charges on renewal date, cancel by
// emailing to stop future charges). That doesn't match how billing
// actually works here: Instant Catalog has exactly one paid plan
// (yearly), billed once upfront via Razorpay with no recurring charge
// at all (see backend/src/controllers/payment.controller.js — "One-time
// order, not a recurring Razorpay subscription"). So the auto-renewal /
// email-to-cancel clauses were dropped; what's kept is the core
// non-refundable, no-partial-credit policy the reference was making.
export default function CancellationRefund() {
  return (
    <Layout
      title="Cancellation & Refund Policy"
      description="How billing, cancellation, and refunds work for Instant Catalog's paid plan."
    >
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900">Cancellation &amp; Refund Policy</h1>
        <p className="mt-1 text-sm text-gray-500">Last updated: September 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700">
          <section>
            <p>
              Techmakers (&ldquo;Company&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) operates Instant Catalog. This
              policy explains how billing, cancellation, and refunds work for the paid plan.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">1. Billing</h2>
            <p className="mt-2">
              Instant Catalog offers one paid plan — an annual (yearly) plan, billed upfront in full at the time of
              purchase and processed securely through Razorpay. We never see or store your card, UPI, or bank
              details.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">2. No Refunds</h2>
            <p className="mt-2">
              All payments for the paid plan are non-refundable. Because it&apos;s billed as a single upfront yearly
              charge rather than a recurring subscription, no partial refund or credit is given for unused time if
              you stop using the service, downgrade, or delete your account before the year is up.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">3. No Automatic Renewal</h2>
            <p className="mt-2">
              Unlike typical subscriptions, your plan does not renew or charge automatically. It simply expires at
              the end of the paid year and your account reverts to the Free plan — your catalogs and data stay
              exactly as they were, just under Free plan limits. You decide if and when to pay for another year;
              since nothing charges without you actively starting a new payment, there&apos;s nothing you need to
              cancel to prevent a future charge.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">4. Cancelling Your Account</h2>
            <p className="mt-2">
              You&apos;re free to stop using Instant Catalog, or request full deletion of your account and data, at
              any time by contacting us (see Section 6). Cancelling doesn&apos;t trigger a refund for the current
              paid year (see Section 2) — your paid features simply remain active through whatever date your current
              term was already paid for.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">5. Failed or Incomplete Payments</h2>
            <p className="mt-2">
              If a payment attempt fails or is left incomplete at checkout, you&apos;re not charged and your plan
              doesn&apos;t change — you can simply try again whenever you&apos;re ready.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">6. Contact</h2>
            <p className="mt-2">
              Questions about billing, cancellation, or this policy? Reach us at{' '}
              <a href="mailto:admin@instantcatalog.app" className="font-medium text-primary-700 hover:text-primary-800">
                admin@instantcatalog.app
              </a>
              , or if you&apos;re already a vendor,{' '}
              <Link href="/login" className="font-medium text-primary-700 hover:text-primary-800">
                log in
              </Link>{' '}
              to open Support.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
