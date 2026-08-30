import Link from 'next/link';
import Layout from '@/components/Layout';

// Kept short and specific to what Instant Catalog actually offers today
// (Free + Premium, one-time Razorpay upgrade, no recurring billing yet)
// rather than generic SaaS boilerplate — update this if the plan/billing
// model changes.
export default function Terms() {
  return (
    <Layout title="Terms of Service" description="The terms and conditions for using Instant Catalog to build and share digital product catalogs.">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900">Terms of Service</h1>
        <p className="mt-1 text-sm text-gray-500">Last updated: August 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700">
          <section>
            <p>
              These terms govern your use of Instant Catalog, a platform for building and sharing digital product
              catalogs. By creating an account, you agree to them.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">1. The Service</h2>
            <p className="mt-2">
              Instant Catalog lets you turn a product spreadsheet into a shareable, digital catalog — with templates,
              a public link and QR code, an enquiry cart for buyers, and basic view analytics. The{' '}
              <strong>Free plan</strong> covers one catalog; <strong>Premium</strong> removes catalog/product limits
              and adds white-label branding and priority support, for the price shown at checkout.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">2. Your Account</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Provide accurate business information and keep your login credentials secure.</li>
              <li>You&apos;re responsible for activity that happens under your account.</li>
              <li>One account per business — don&apos;t create multiple free accounts to bypass plan limits.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">3. Your Content</h2>
            <p className="mt-2">
              You own the products, images, and descriptions you upload. You&apos;re responsible for having the right
              to use and publish them. We may remove content that&apos;s illegal, infringes someone else&apos;s rights,
              or violates these terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">4. Acceptable Use</h2>
            <p className="mt-2">Don&apos;t use Instant Catalog to list, promote, or sell:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li><strong>Illegal goods or services</strong> — anything illegal to sell, possess, export, or import under Indian law or the law of a place your buyers are located.</li>
              <li><strong>Weapons</strong> — firearms, ammunition, explosives, or other restricted weapons.</li>
              <li><strong>Drugs &amp; controlled substances</strong> — narcotics, psychotropic substances, or anything marketed for illegal drug use.</li>
              <li><strong>Regulated goods without a valid licence</strong> — pharmaceuticals, medical devices, tobacco, alcohol, or other goods that legally require a licence you don&apos;t hold.</li>
              <li><strong>Counterfeit or pirated goods</strong> — replicas, knock-offs, or unauthorised copies of branded or copyrighted products.</li>
              <li><strong>Stolen goods.</strong></li>
              <li><strong>Adult content</strong> — sexually explicit products or services.</li>
              <li><strong>Hate, violence, or harassment</strong> — anything that promotes hatred, violence, or discrimination against people or groups.</li>
              <li><strong>Protected wildlife</strong> — products made from endangered or protected species, or that otherwise violate wildlife protection law.</li>
              <li><strong>Undisclosed hazardous materials</strong> — items dangerous to handle or ship without the safety disclosures required by law.</li>
              <li><strong>Scams</strong> — pyramid/Ponzi schemes, fake investment offers, or other deceptive money-making schemes.</li>
              <li><strong>Other people&apos;s personal data</strong> — customer lists, leaked data, or other personal information you don&apos;t have the right to share.</li>
              <li>Anything else that&apos;s deceptive, fraudulent, or intended to harm buyers.</li>
            </ul>
            <p className="mt-3">You also may not:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Use a catalog to defraud, spam, or mislead buyers.</li>
              <li>Attempt to break, reverse-engineer, or overload the platform.</li>
              <li>Resell or sublicense access to the platform itself.</li>
            </ul>
            <p className="mt-3">
              We reserve the right to remove any catalog, product listing, or account — at any time and without prior
              notice — if we reasonably believe it violates this policy or applicable law. Repeated or serious
              violations may result in permanent account suspension. If you come across a catalog on Instant Catalog
              that you believe violates this policy, please report it to us through Support.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">5. Payments</h2>
            <p className="mt-2">
              Upgrading to Premium is a one-time payment processed securely through Razorpay — we never see or store
              your card, UPI, or bank details. There&apos;s no automatic recurring billing today; if that changes,
              we&apos;ll make it clear before you pay.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">6. Public Catalogs</h2>
            <p className="mt-2">
              Anything you publish is visible to anyone with the link — there&apos;s no private/unlisted mode today.
              Don&apos;t publish confidential pricing or information you don&apos;t want publicly accessible.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">7. Termination</h2>
            <p className="mt-2">
              You can stop using Instant Catalog anytime. We may suspend or close accounts that violate these terms.
              To request full deletion of your account and data, contact us through Support.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">8. No Warranty, Limited Liability</h2>
            <p className="mt-2">
              Instant Catalog is provided &ldquo;as is.&rdquo; We work to keep it reliable but don&apos;t guarantee
              uninterrupted availability. To the extent permitted by law, we&apos;re not liable for indirect damages
              or lost profits arising from your use of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">9. Changes</h2>
            <p className="mt-2">We may update these terms as the platform evolves. Material changes will update the date above.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">10. Governing Law</h2>
            <p className="mt-2">These terms are governed by the laws of India.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">11. Contact</h2>
            <p className="mt-2">
              Questions about these terms? Reach us through the Support page in your dashboard.{' '}
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
