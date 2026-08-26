import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { apiFetch } from '@/utils/api';
import { currencySymbol } from '@/utils/currency';

// Marketing homepage. Styling for this page only lives in
// tailwind.config.js (brand-* colors, marquee/float keyframes) and
// styles/globals.css (.text-gradient, .hero-grid-bg, .feature-tab-*) —
// none of it is used by the vendor dashboard or auth pages.

type FeatureTabId = 'builder' | 'branding' | 'embed' | 'sharing' | 'analytics' | 'pwa';

const FEATURE_TABS: { id: FeatureTabId; label: string; icon: string }[] = [
  { id: 'builder', label: 'Builder', icon: 'fa-pen-ruler' },
  { id: 'branding', label: 'Your Own Branding', icon: 'fa-globe' },
  { id: 'embed', label: 'Add to Your Website', icon: 'fa-code' },
  { id: 'sharing', label: 'Sharing', icon: 'fa-share-nodes' },
  { id: 'analytics', label: 'Analytics', icon: 'fa-chart-line' },
  { id: 'pwa', label: 'PWA', icon: 'fa-mobile-screen' },
];

const PROBLEMS: { icon: string; label: string }[] = [
  { icon: 'fa-tag', label: 'Updating prices takes hours every time?' },
  { icon: 'fa-images', label: 'Every small product change requires redesigning the catalog?' },
  { icon: 'fa-hourglass-half', label: 'Dealers and customers keep using outdated catalogs?' },
  { icon: 'fa-file-pdf', label: 'Multiple versions of catalogs are scattered everywhere?' },
  { icon: 'fa-code-branch', label: 'Still struggling to get sales enquiry?' },
];

const SOLUTION_STEPS: { icon: string; title: string; body: string }[] = [
  { icon: 'fa-file-excel', title: 'Upload Excel', body: 'Your products, images and prices.' },
  { icon: 'fa-palette', title: 'Choose Design -> Catalog Ready', body: 'Pick a professional template and catalog generated automatically.' },
  { icon: 'fa-share-nodes', title: 'Share Everywhere', body: 'Website, WhatsApp, Email, Messages.' },
  { icon: 'fa-inbox', title: 'Receive Enquiries', body: 'Sales enquiries land straight in your dashboard.' },
];

function CheckItem({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <li className={`flex items-start gap-3 text-sm ${muted ? 'text-brand-muted/50' : ''}`}>
      <span
        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
          muted ? 'bg-brand-border text-brand-muted/40' : 'bg-brand-green-light text-brand-green'
        }`}
      >
        <i className={`fa-solid ${muted ? 'fa-xmark' : 'fa-check'} text-[9px]`}></i>
      </span>
      <span>{children}</span>
    </li>
  );
}

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FeatureTabId>('builder');
  const [ctaEmail, setCtaEmail] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [premiumPrice, setPremiumPrice] = useState<{ amount: number; currency: string } | null>(null);

  // Public pricing card, hit before anyone has an account — there's no
  // saved currency preference to resolve a price from the way
  // resolveVendorPrice (backend) does for a logged-in vendor, so this
  // guesses India vs international from the browser's own timezone
  // instead. Imprecise (VPNs, travelers) but needs no signup flow, IP
  // lookup service, or API key to work.
  useEffect(() => {
    apiFetch<{ india: { amount: number; currency: string }; international: { amount: number; currency: string } }>(
      '/public/plan-price'
    )
      .then((res) => {
        // 'Asia/Calcutta' is the pre-1995 IANA name for the same zone —
        // some environments (confirmed via testing) still report it
        // instead of the modern 'Asia/Kolkata', so both are checked.
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const isIndia = tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta';
        setPremiumPrice(isIndia ? res.india : res.international);
      })
      .catch(() => {
        // Non-fatal — the price line just stays blank if this fails.
      });
  }, []);

  // manifest.json's start_url points the installed PWA at /login, but an
  // *already*-installed home screen icon doesn't reliably re-read the
  // manifest just because it changed — iOS in particular can keep opening
  // the old start_url until the icon is removed and re-added. This is the
  // safety net: if we're somehow running standalone and still landed here,
  // bounce to the real vendor app immediately instead of showing the
  // marketing site.
  useEffect(() => {
    const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (window.matchMedia('(display-mode: standalone)').matches || iosStandalone) {
      router.replace('/login');
    }
  }, [router]);

  function handleCtaSubmit(e: FormEvent) {
    e.preventDefault();
    window.location.href = `/signup${ctaEmail ? `?email=${encodeURIComponent(ctaEmail)}` : ''}`;
  }

  return (
    <div className="bg-brand-bg font-sans text-brand-text antialiased overflow-x-hidden">
      <Head>
        <title>Instant Catalog — Build Stunning Product Catalogs in Minutes</title>
      </Head>

      {/* Navigation */}
      <nav className="fixed top-5 left-1/2 z-50 w-[92%] max-w-7xl -translate-x-1/2">
        <div className="flex items-center justify-between rounded-full border border-brand-border bg-white/90 px-6 py-3 shadow-lg shadow-brand-accent/5 backdrop-blur-xl">
          <div className="flex items-center gap-8">
            <a href="#" className="text-xl font-black tracking-tight flex items-center gap-2 text-brand-text">
              <span className="w-7 h-7 bg-brand-accent rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-layer-group text-white text-xs"></i>
              </span>
              Instant Catalog
            </a>
            <div className="hidden md:flex items-center gap-7 text-sm font-semibold text-brand-muted">
              <a href="#problem-solution" className="hover:text-brand-accent transition-colors">Problem &amp; Solution</a>
              <a href="#features" className="hover:text-brand-accent transition-colors">Features</a>
              <a href="#benefits" className="hover:text-brand-accent transition-colors">Benefits</a>
              <a href="#who" className="hover:text-brand-accent transition-colors">Who It&apos;s For</a>
              <a href="#pricing" className="hover:text-brand-accent transition-colors">Pricing</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm font-semibold text-brand-muted transition-colors hover:text-brand-text md:block px-4 py-2">
              Log In
            </Link>
            <Link href="/signup" className="bg-brand-accent text-white px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-md shadow-brand-accent/30">
              Start Free
            </Link>
            <button
              type="button"
              onClick={() => setMobileNavOpen((open) => !open)}
              aria-label="Toggle menu"
              aria-expanded={mobileNavOpen}
              className="flex h-9 w-9 items-center justify-center rounded-full text-brand-text hover:bg-brand-border/40 md:hidden"
            >
              <i className={`fa-solid ${mobileNavOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="mt-2 flex flex-col gap-1 rounded-2xl border border-brand-border bg-white/95 p-4 shadow-lg shadow-brand-accent/5 backdrop-blur-xl md:hidden">
            <a href="#problem-solution" onClick={() => setMobileNavOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-brand-muted hover:bg-brand-border/40 hover:text-brand-text">
              Problem &amp; Solution
            </a>
            <a href="#features" onClick={() => setMobileNavOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-brand-muted hover:bg-brand-border/40 hover:text-brand-text">
              Features
            </a>
            <a href="#benefits" onClick={() => setMobileNavOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-brand-muted hover:bg-brand-border/40 hover:text-brand-text">
              Benefits
            </a>
            <a href="#who" onClick={() => setMobileNavOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-brand-muted hover:bg-brand-border/40 hover:text-brand-text">
              Who It&apos;s For
            </a>
            <a href="#pricing" onClick={() => setMobileNavOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-brand-muted hover:bg-brand-border/40 hover:text-brand-text">
              Pricing
            </a>
            <Link href="/login" onClick={() => setMobileNavOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-brand-muted hover:bg-brand-border/40 hover:text-brand-text">
              Log In
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <header className="relative min-h-[820px] flex items-center pt-36 pb-20 px-6 overflow-hidden hero-grid-bg">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-brand-accent/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-brand-magenta/8 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="text-center space-y-8 max-w-4xl mx-auto">
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-[1.1]">
              Turn your product Excel into a<br />
              <span className="text-gradient">sales catalog</span>—in minutes.
            </h1>
            <p className="text-lg md:text-xl text-brand-muted max-w-2xl mx-auto leading-relaxed">
              Stop spending days designing catalogs. Upload your spreadsheet, choose a template, and publish a professional digital catalog your sales team can share instantly.
            </p>
            <form onSubmit={handleCtaSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto pt-2">
              <input
                type="email"
                value={ctaEmail}
                onChange={(e) => setCtaEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="flex-1 rounded-2xl border border-brand-border bg-white px-5 py-4 text-sm text-brand-text placeholder-brand-muted/70 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
              />
              <button type="submit" className="bg-brand-accent text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-wider text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-brand-accent/25 whitespace-nowrap">
                Start Free
              </button>
            </form>
            <p className="text-xs text-brand-muted">No credit card required · Free forever plan available</p>
          </div>

          {/* Hero Image */}
          <div className="mt-16 relative max-w-5xl mx-auto">
            <div className="absolute -inset-4 bg-gradient-to-r from-brand-accent/20 via-brand-magenta/10 to-brand-accent/20 rounded-[3rem] blur-2xl opacity-60"></div>
            <div className="relative rounded-[2rem] overflow-hidden border border-brand-border shadow-2xl shadow-brand-accent/10 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="w-full h-auto max-h-[460px] object-cover"
                src="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_a02cf0488e_ca343f200a464abc.png"
                alt="Instant Catalog dashboard interface"
              />
            </div>
            {/* Floating Badges */}
            <div className="absolute -top-5 -left-4 bg-white border border-brand-border px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-float">
              <div className="w-9 h-9 rounded-full bg-brand-green-light flex items-center justify-center text-brand-green">
                <i className="fa-solid fa-check text-sm"></i>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-brand-muted">Published</p>
                <p className="text-sm font-bold text-brand-text">Catalog is Live!</p>
              </div>
            </div>
            <div className="absolute -bottom-5 -right-4 bg-white border border-brand-border px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3" style={{ animation: 'float 4s ease-in-out infinite 2s' }}>
              <div className="w-9 h-9 rounded-full bg-brand-accent-light flex items-center justify-center text-brand-accent">
                <i className="fa-solid fa-users text-sm"></i>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-brand-muted">This week</p>
                <p className="text-sm font-bold text-brand-text">+2,840 Views</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Marquee / Social Proof */}
      <section className="py-10 border-y border-brand-border bg-white overflow-hidden">
        <div className="flex w-[200%]">
          {[0, 1].map((rep) => (
            <div key={rep} className="animate-marquee whitespace-nowrap flex items-center gap-14 pr-14">
              {['Digital Catalog', 'PWA Ready', 'No-Code Builder', 'Instant Sharing', 'Multiple Templates', 'Multi-Platform', 'Enquiry Tracking'].map(
                (label) => (
                  <span key={label} className="flex items-center gap-14">
                    <span className="text-xs font-bold uppercase tracking-[0.3em] text-brand-muted/50">{label}</span>
                    <i className="fa-solid fa-circle text-brand-accent/20 text-[6px]"></i>
                  </span>
                )
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Problem & Solution Section */}
      <section id="problem-solution" className="py-28 px-6 bg-brand-bg">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-accent-light text-brand-accent text-xs font-bold uppercase tracking-widest mb-4">
              <i className="fa-solid fa-circle-info text-[10px]"></i>
              Problem &amp; Solution
            </span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-5">
              Still Doing It the Old Way?<br />
              <span className="text-gradient">Instant Catalog</span> Fixes That.
            </h2>
            <p className="text-brand-muted max-w-xl mx-auto">
              See how businesses replace messy, manual catalog work with one simple system.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            {/* The Problem */}
            <div className="relative overflow-hidden rounded-3xl border border-brand-border bg-white p-8">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-400 to-red-200"></div>
              <div className="flex items-center gap-3 mb-6">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                </span>
                <div>
                  <h3 className="text-xl font-black tracking-tight">The Problem</h3>
                  <p className="text-xs text-brand-muted">What&apos;s slowing your business down</p>
                </div>
              </div>
              <div className="space-y-3">
                {PROBLEMS.map(({ icon, label }) => (
                  <div key={label} className="flex items-center gap-3 rounded-2xl bg-red-50/60 px-4 py-3.5">
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white text-red-500 text-sm">
                      <i className={`fa-solid ${icon}`}></i>
                    </span>
                    <span className="text-sm font-semibold text-brand-text">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* The Solution */}
            <div className="relative flex flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-brand-accent to-indigo-700 p-8 shadow-2xl shadow-brand-accent/20">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>
              <div className="relative z-10 flex-1">
                <div className="flex items-center gap-3 mb-6">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white">
                    <i className="fa-solid fa-lightbulb"></i>
                  </span>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-white">The Solution</h3>
                    <p className="text-xs text-white/70">Four simple steps</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {SOLUTION_STEPS.map((step, i) => (
                    <div
                      key={step.title}
                      className="flex items-center gap-3.5 rounded-2xl bg-white/10 px-4 py-3.5 ring-1 ring-white/10 transition-colors hover:bg-white/15"
                    >
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-brand-accent">
                        {i + 1}
                      </span>
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
                        <i className={`fa-solid ${step.icon} text-sm`}></i>
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white">{step.title}</p>
                        <p className="text-xs leading-snug text-white/70">{step.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Link
                href="/signup"
                className="relative z-10 mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-center text-sm font-bold uppercase tracking-widest text-brand-accent shadow-lg transition-all hover:bg-indigo-50"
              >
                Start Building Free
                <i className="fa-solid fa-arrow-right text-xs"></i>
              </Link>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-semibold uppercase tracking-widest text-brand-muted">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-circle-check text-brand-green"></i>
              No Credit Card Required
            </div>
            <div className="h-1 w-1 rounded-full bg-brand-border"></div>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-circle-check text-brand-green"></i>
              Setup in Minutes
            </div>
            <div className="h-1 w-1 rounded-full bg-brand-border"></div>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-circle-check text-brand-green"></i>
              Free Forever Plan
            </div>
          </div>
        </div>
      </section>

      {/* Features Section with Tabs */}
      <section id="features" className="py-28 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-accent-light text-brand-accent text-xs font-bold uppercase tracking-widest mb-4">Features</span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-5">Everything You Need<br />to Sell Digitally</h2>
            <p className="text-brand-muted max-w-xl mx-auto">Powerful tools designed for speed, simplicity, and impact.</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap justify-center gap-3 mb-14">
            {FEATURE_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  activeTab === tab.id ? 'feature-tab-active' : 'feature-tab-inactive border border-brand-border'
                }`}
              >
                <i className={`fa-solid ${tab.icon} mr-2`}></i>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Feature Panels */}
          {activeTab === 'builder' && (
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-brand-accent-light flex items-center justify-center text-brand-accent text-xl">
                  <i className="fa-solid fa-pen-ruler"></i>
                </div>
                <h3 className="text-3xl font-black tracking-tight">Simple Catalog Builder</h3>
                <p className="text-brand-muted text-lg leading-relaxed">No design skills needed. Add products, categories, and specifications through a clean dashboard, and pick a layout — what you build is exactly what your customers see.</p>
                <ul className="space-y-3">
                  <CheckItem>Guided product &amp; category editor</CheckItem>
                  <CheckItem>Bulk product import via Excel + image ZIP</CheckItem>
                  <CheckItem>Custom logo, banner &amp; currency</CheckItem>
                </ul>
              </div>
              <div className="rounded-3xl overflow-hidden border border-brand-border shadow-xl shadow-brand-accent/5 bg-brand-bg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="w-full h-auto max-h-80 object-cover"
                  src="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_b66ddcc890_e80aa0b69b0e9705.png"
                  alt="Catalog builder interface"
                />
              </div>
            </div>
          )}

          {activeTab === 'branding' && (
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-brand-magenta-light flex items-center justify-center text-brand-magenta text-xl">
                  <i className="fa-solid fa-globe"></i>
                </div>
                <h3 className="text-3xl font-black tracking-tight">Your Own Branding, Not Ours</h3>
                <p className="text-brand-muted text-lg leading-relaxed">Point your own domain — or a free branded subdomain — at your catalog. Visitors never see a shared link; every catalog you own looks like it lives on your own website.</p>
                <ul className="space-y-3">
                  <CheckItem>Free branded subdomain (yourbrand.instantcatalog.app)</CheckItem>
                  <CheckItem>Connect your own custom domain</CheckItem>
                  <CheckItem>Every catalog you own reachable under it automatically</CheckItem>
                </ul>
              </div>
              <div className="rounded-3xl overflow-hidden border border-brand-border shadow-xl bg-brand-bg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="w-full h-auto max-h-80 object-cover"
                  src="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_919058ecc0_e69e0815446a261d.png"
                  alt="Custom domain settings"
                />
              </div>
            </div>
          )}

          {activeTab === 'embed' && (
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-brand-yellow-light flex items-center justify-center text-brand-yellow text-xl">
                  <i className="fa-solid fa-code"></i>
                </div>
                <h3 className="text-3xl font-black tracking-tight">Add It to Your Website</h3>
                <p className="text-brand-muted text-lg leading-relaxed">Drop one line of code onto your existing website and a &ldquo;Visit Catalog&rdquo; button appears instantly — no developer needed.</p>
                <ul className="space-y-3">
                  <CheckItem>One-line embed snippet, no coding required</CheckItem>
                  <CheckItem>Floating button or inline placement</CheckItem>
                  <CheckItem>Opens in a new tab or an in-page popup</CheckItem>
                </ul>
              </div>
              <div className="rounded-3xl overflow-hidden border border-brand-border shadow-xl bg-brand-bg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="w-full h-auto max-h-80 object-cover"
                  src="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_403b7aeed0_de0ea8b68fb069bd.png"
                  alt="Embeddable Visit Catalog button"
                />
              </div>
            </div>
          )}

          {activeTab === 'sharing' && (
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-brand-yellow-light flex items-center justify-center text-brand-yellow text-xl">
                  <i className="fa-solid fa-share-nodes"></i>
                </div>
                <h3 className="text-3xl font-black tracking-tight">Share Instantly, Everywhere</h3>
                <p className="text-brand-muted text-lg leading-relaxed">Publish your catalog with a unique link and QR code. Your customers always see the latest version — no downloads, no outdated PDFs floating around.</p>
                <ul className="space-y-3">
                  <CheckItem>Shareable link &amp; QR code</CheckItem>
                  <CheckItem>Downloadable PDF version</CheckItem>
                  <CheckItem>Built-in enquiry cart for buyers</CheckItem>
                </ul>
              </div>
              <div className="rounded-3xl overflow-hidden border border-brand-border shadow-xl bg-brand-bg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="w-full h-auto max-h-80 object-cover"
                  src="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_403b7aeed0_de0ea8b68fb069bd.png"
                  alt="Catalog sharing via link and QR code"
                />
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-brand-green-light flex items-center justify-center text-brand-green text-xl">
                  <i className="fa-solid fa-chart-line"></i>
                </div>
                <h3 className="text-3xl font-black tracking-tight">Never Miss an Enquiry</h3>
                <p className="text-brand-muted text-lg leading-relaxed">Buyers add products to an enquiry cart and submit their contact details directly from your catalog — every enquiry lands in one dashboard so you can follow up fast.</p>
                <ul className="space-y-3">
                  <CheckItem>Centralized enquiry dashboard</CheckItem>
                  <CheckItem>Buyer contact details &amp; requested items</CheckItem>
                  <CheckItem>Direct WhatsApp follow-up</CheckItem>
                </ul>
              </div>
              <div className="rounded-3xl overflow-hidden border border-brand-border shadow-xl bg-brand-bg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="w-full h-auto max-h-80 object-cover"
                  src="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_75a06fee1b_4d28bdaf92e152cb.png"
                  alt="Enquiry dashboard"
                />
              </div>
            </div>
          )}

          {activeTab === 'pwa' && (
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-brand-accent-light flex items-center justify-center text-brand-accent text-xl">
                  <i className="fa-solid fa-mobile-screen"></i>
                </div>
                <h3 className="text-3xl font-black tracking-tight">App-Like Experience with PWA</h3>
                <p className="text-brand-muted text-lg leading-relaxed">Your dashboard can be installed as an app on any smartphone or desktop — no app store required. It loads instantly, giving you a native app feel.</p>
                <ul className="space-y-3">
                  <CheckItem>Installable on desktop, iOS &amp; Android</CheckItem>
                  <CheckItem>Fast, app-like navigation</CheckItem>
                  <CheckItem>Install prompt built in</CheckItem>
                </ul>
              </div>
              <div className="rounded-3xl overflow-hidden border border-brand-border shadow-xl bg-brand-bg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="w-full h-auto max-h-80 object-cover"
                  src="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_598a10b089_6a10fe057074f179.png"
                  alt="Progressive web app install prompt"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-28 px-6 bg-brand-bg">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-magenta-light text-brand-magenta text-xs font-bold uppercase tracking-widest mb-4">Why Instant Catalog</span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-5">Built to Grow<br />Your Business Faster</h2>
            <p className="text-brand-muted max-w-xl mx-auto">Real outcomes for real businesses — not just features, but results.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-8 border border-brand-border hover:shadow-xl hover:shadow-brand-accent/5 hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-brand-accent-light flex items-center justify-center text-brand-accent mb-6 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-gauge-high text-lg"></i>
              </div>
              <h3 className="text-xl font-bold mb-3">Launch in Minutes</h3>
              <p className="text-brand-muted text-sm leading-relaxed">Go from zero to a fully published catalog faster than making a cup of coffee. No setup headaches, no technical know-how required.</p>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-brand-border hover:shadow-xl hover:shadow-brand-magenta/5 hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-brand-magenta-light flex items-center justify-center text-brand-magenta mb-6 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-print text-lg"></i>
              </div>
              <h3 className="text-xl font-bold mb-3">Replace Expensive Print Catalogs</h3>
              <p className="text-brand-muted text-sm leading-relaxed">Save on printing costs. Update products, prices, and images instantly — your catalog is always accurate and up to date.</p>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-brand-border hover:shadow-xl hover:shadow-brand-green/5 hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-brand-green-light flex items-center justify-center text-brand-green mb-6 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-earth-americas text-lg"></i>
              </div>
              <h3 className="text-xl font-bold mb-3">Reach Customers Anywhere</h3>
              <p className="text-brand-muted text-sm leading-relaxed">Share your catalog via link, QR code, or downloadable PDF. Customers browse from any device — phone, tablet, or desktop.</p>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-brand-border hover:shadow-xl hover:shadow-brand-yellow/5 hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-brand-yellow-light flex items-center justify-center text-brand-yellow mb-6 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-hand-pointer text-lg"></i>
              </div>
              <h3 className="text-xl font-bold mb-3">Boost Engagement &amp; Enquiries</h3>
              <p className="text-brand-muted text-sm leading-relaxed">Interactive product pages with an enquiry cart, image galleries, and video support keep visitors engaged and turn browsers into buyers.</p>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-brand-border hover:shadow-xl hover:shadow-brand-accent/5 hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-brand-accent-light flex items-center justify-center text-brand-accent mb-6 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-shield-halved text-lg"></i>
              </div>
              <h3 className="text-xl font-bold mb-3">Built for Multiple Catalogs</h3>
              <p className="text-brand-muted text-sm leading-relaxed">Run separate catalogs for different product lines or customer segments, each with its own template, link, and QR code.</p>
            </div>

            <div className="bg-gradient-to-br from-brand-accent to-indigo-700 rounded-3xl p-8 hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-infinity text-lg"></i>
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Always Up-to-Date</h3>
              <p className="text-white/80 text-sm leading-relaxed">One update and every link instantly reflects your changes. No reprinting, no resending, no outdated files floating around.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Who Can Use Section */}
      <section id="who" className="py-28 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-green-light text-brand-green text-xs font-bold uppercase tracking-widest mb-4">Who It&apos;s For</span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-5">Made for Every Business<br />That Sells Products</h2>
            <p className="text-brand-muted max-w-xl mx-auto">From solo entrepreneurs to large distributors — Instant Catalog adapts to your workflow.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            <div className="rounded-3xl overflow-hidden border border-brand-border group hover:shadow-xl transition-all duration-300">
              <div className="h-44 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_a8a072d73a_87c45d07c0b6ffc5.png" alt="Manufacturers" />
              </div>
              <div className="p-6 bg-white">
                <div className="w-8 h-8 rounded-xl bg-brand-magenta-light flex items-center justify-center text-brand-magenta mb-3">
                  <i className="fa-solid fa-industry text-sm"></i>
                </div>
                <h3 className="font-bold text-lg mb-1">Manufacturers</h3>
                <p className="text-brand-muted text-sm">Launch a digital catalog straight from your production line — dealers and buyers always see your latest specs and pricing.</p>
              </div>
            </div>

            <div className="rounded-3xl overflow-hidden border border-brand-border group hover:shadow-xl transition-all duration-300">
              <div className="h-44 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_cea937556b_a10946a1cbc6a602.png" alt="Online sellers" />
              </div>
              <div className="p-6 bg-white">
                <div className="w-8 h-8 rounded-xl bg-brand-accent-light flex items-center justify-center text-brand-accent mb-3">
                  <i className="fa-solid fa-cart-shopping text-sm"></i>
                </div>
                <h3 className="font-bold text-lg mb-1">Online Sellers</h3>
                <p className="text-brand-muted text-sm">Turn your product list into a shareable catalog customers can browse, enquire from, and buy through anywhere.</p>
              </div>
            </div>

            <div className="rounded-3xl overflow-hidden border border-brand-border group hover:shadow-xl transition-all duration-300">
              <div className="h-44 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_7b2cf81222_355188624a667261.png" alt="Wholesalers & distributors" />
              </div>
              <div className="p-6 bg-white">
                <div className="w-8 h-8 rounded-xl bg-brand-yellow-light flex items-center justify-center text-brand-yellow mb-3">
                  <i className="fa-solid fa-boxes-stacked text-sm"></i>
                </div>
                <h3 className="font-bold text-lg mb-1">Wholesalers/Distributors</h3>
                <p className="text-brand-muted text-sm">Share bulk pricing, MOQs, and product specs with buyers and resellers instantly.</p>
              </div>
            </div>

            <div className="rounded-3xl overflow-hidden border border-brand-border group hover:shadow-xl transition-all duration-300">
              <div className="h-44 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_9e0a18aca9_47e4398d928bd36c.png" alt="Industrial suppliers" />
              </div>
              <div className="p-6 bg-white">
                <div className="w-8 h-8 rounded-xl bg-brand-green-light flex items-center justify-center text-brand-green mb-3">
                  <i className="fa-solid fa-screwdriver-wrench text-sm"></i>
                </div>
                <h3 className="font-bold text-lg mb-1">Industrial Suppliers</h3>
                <p className="text-brand-muted text-sm">Showcase technical specs, bulk SKUs, and part numbers in one catalog that&apos;s always up to date.</p>
              </div>
            </div>
          </div>

          <div className="bg-brand-bg rounded-3xl p-8 border border-brand-border">
            <p className="text-sm font-bold uppercase tracking-widest text-brand-muted mb-6">And many more...</p>
            <div className="flex flex-wrap gap-3">
              {[
                { icon: 'fa-shirt', label: 'Fashion & Retail' },
                { icon: 'fa-couch', label: 'Home & Furniture' },
                { icon: 'fa-utensils', label: 'Food & Beverage' },
                { icon: 'fa-gem', label: 'Jewelry & Accessories' },
                { icon: 'fa-laptop', label: 'Electronics' },
                { icon: 'fa-seedling', label: 'Agriculture & Organic' },
                { icon: 'fa-paint-roller', label: 'Hardware & Paint' },
              ].map(({ icon, label }) => (
                <span key={label} className="px-4 py-2 rounded-full bg-white border border-brand-border text-sm font-medium text-brand-text flex items-center gap-2">
                  <i className={`fa-solid ${icon} text-brand-accent text-xs`}></i>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-28 px-6 bg-brand-bg">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-accent-light text-brand-accent text-xs font-bold uppercase tracking-widest mb-4">Pricing</span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-5">Simple Plans.<br />No Surprises.</h2>
            <p className="text-brand-muted max-w-lg mx-auto">Two straightforward plans. Cancel anytime.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Free Plan */}
            <div className="bg-white rounded-[2rem] p-10 border border-brand-border flex flex-col shadow-sm hover:shadow-lg transition-shadow">
              <div className="mb-8">
                <div className="w-10 h-10 rounded-xl bg-brand-bg flex items-center justify-center text-brand-muted mb-4">
                  <i className="fa-solid fa-seedling"></i>
                </div>
                <h4 className="text-2xl font-black mb-1">Free</h4>
                <p className="text-brand-muted text-sm">Perfect to get started</p>
              </div>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-black">$0</span>
                <span className="text-brand-muted text-sm">/ forever</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                <CheckItem><strong>1 catalog</strong></CheckItem>
                <CheckItem>Shareable link &amp; QR code</CheckItem>
                <CheckItem>Add to Your Website (Embed Code)</CheckItem>
                <CheckItem>Enquiry cart &amp; dashboard</CheckItem>
                <CheckItem>Multiple templates</CheckItem>
                <CheckItem>Install as an App (PWA)</CheckItem>
                <CheckItem>Views &amp; Clicks Tracking</CheckItem>
                <CheckItem>Bulk product upload</CheckItem>
                <CheckItem>Download as PDF</CheckItem>
              </ul>
              <Link href="/signup" className="w-full py-4 rounded-2xl border-2 border-brand-border font-bold text-sm uppercase tracking-widest text-center hover:bg-brand-bg transition-all">
                Get Started Free
              </Link>
            </div>

            {/* Premium Plan */}
            <div className="bg-brand-accent rounded-[2rem] p-10 flex flex-col shadow-2xl shadow-brand-accent/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4"></div>
              <div className="relative z-10 flex flex-1 flex-col">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white mb-4">
                      <i className="fa-solid fa-rocket"></i>
                    </div>
                    <h4 className="text-2xl font-black text-white mb-1">Premium</h4>
                    <p className="text-white/70 text-sm">For growing businesses</p>
                  </div>
                  <span className="bg-brand-magenta text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">Best Value</span>
                </div>
                <div className="flex items-baseline gap-1 mb-8">
                  {premiumPrice ? (
                    <>
                      <span className="text-5xl font-black text-white">
                        {currencySymbol(premiumPrice.currency)}
                        {premiumPrice.amount}
                      </span>
                    </>
                  ) : (
                    <span className="text-5xl font-black text-white/40">···</span>
                  )}
                </div>
                {/* Free Setup Help is the one line most likely to convert a
                    fence-sitter — a gold callout instead of a plain bullet
                    among six, matching the same treatment already used in
                    the Upgrade-to-Paid dashboard modal. */}
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-white/20 bg-white/10 p-4">
                  <span className="text-xl">🎁</span>
                  <p className="text-sm text-white">
                    <strong>Free Setup Help</strong> — send us your product Excel and our team builds your first
                    catalog for you.
                  </p>
                </div>
                <ul className="space-y-4 mb-10 flex-1">
                  <li className="flex items-start gap-3 text-sm text-white">
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white flex-shrink-0 mt-0.5"><i className="fa-solid fa-check text-[9px]"></i></span>
                    <span>Unlimited catalogs</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-white">
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white flex-shrink-0 mt-0.5"><i className="fa-solid fa-check text-[9px]"></i></span>
                    <span>Unlimited products</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-white">
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white flex-shrink-0 mt-0.5"><i className="fa-solid fa-check text-[9px]"></i></span>
                    <span>Your Own Branding</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-white">
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white flex-shrink-0 mt-0.5"><i className="fa-solid fa-check text-[9px]"></i></span>
                    <span>Priority support</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-white">
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white flex-shrink-0 mt-0.5"><i className="fa-solid fa-check text-[9px]"></i></span>
                    <span>Everything else stays exactly the same</span>
                  </li>
                </ul>
                <Link href="/signup" className="w-full py-4 rounded-2xl bg-white text-brand-accent font-bold text-sm uppercase tracking-widest text-center hover:bg-indigo-50 transition-all block shadow-lg">
                  Get Started Free
                </Link>
                <p className="text-center text-white/50 text-xs mt-4">Talk to us for pricing that fits your business</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA / Register Section */}
      <section className="py-28 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-[3rem] overflow-hidden">
            <div className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="w-full h-full object-cover" src="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_781b258343_ce01d165ca6b7dcd.png" alt="Abstract gradient background" />
            </div>
            <div className="absolute inset-0 bg-brand-accent/80 backdrop-blur-sm"></div>
            <div className="relative z-10 text-center py-24 px-8 space-y-8">
              <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-white leading-tight">Start Building Your<br />Catalog Today — Free.</h2>
              <p className="text-white/80 text-lg max-w-lg mx-auto">Join businesses already using Instant Catalog to sell smarter and reach more customers.</p>
              <form onSubmit={handleCtaSubmit} className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto bg-white/15 p-2.5 rounded-2xl backdrop-blur-xl border border-white/20">
                <input
                  type="email"
                  value={ctaEmail}
                  onChange={(e) => setCtaEmail(e.target.value)}
                  placeholder="Enter your business email..."
                  className="flex-1 bg-transparent border-none text-white placeholder-white/50 px-5 py-3.5 focus:outline-none text-sm"
                />
                <button type="submit" className="bg-white text-brand-accent px-8 py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-indigo-50 transition-all shadow-xl whitespace-nowrap">
                  Get Started Free
                </button>
              </form>
              <div className="flex items-center justify-center gap-8 text-xs font-semibold uppercase tracking-widest text-white/60">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-check"></i>
                  Free Forever Plan
                </div>
                <div className="w-1 h-1 bg-white/30 rounded-full"></div>
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-check"></i>
                  No Credit Card
                </div>
                <div className="w-1 h-1 bg-white/30 rounded-full hidden sm:block"></div>
                <div className="hidden sm:flex items-center gap-2">
                  <i className="fa-solid fa-check"></i>
                  Setup in Minutes
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-text pt-20 pb-10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
            <div className="col-span-2 lg:col-span-2">
              <a href="#" className="text-2xl font-black tracking-tight flex items-center gap-2 text-white mb-5">
                <span className="w-8 h-8 bg-brand-accent rounded-lg flex items-center justify-center">
                  <i className="fa-solid fa-layer-group text-white text-sm"></i>
                </span>
                Instant Catalog
              </a>
              <p className="text-white/40 max-w-xs text-sm leading-relaxed">The digital catalog builder for modern businesses that want to sell smarter.</p>
              <div className="flex items-center gap-4 mt-6">
                <a href="#" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-all"><i className="fa-brands fa-x-twitter text-xs"></i></a>
                <a href="#" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-all"><i className="fa-brands fa-instagram text-xs"></i></a>
                <a href="#" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-all"><i className="fa-brands fa-linkedin-in text-xs"></i></a>
              </div>
            </div>
            <div className="space-y-5">
              <h4 className="font-bold uppercase text-[10px] tracking-widest text-white/30">Product</h4>
              <ul className="space-y-3 text-sm text-white/50">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Vendor Login</Link></li>
              </ul>
            </div>
            <div className="space-y-5">
              <h4 className="font-bold uppercase text-[10px] tracking-widest text-white/30">Company</h4>
              <ul className="space-y-3 text-sm text-white/50">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div className="space-y-5">
              <h4 className="font-bold uppercase text-[10px] tracking-widest text-white/30">Legal</h4>
              <ul className="space-y-3 text-sm text-white/50">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/30 text-xs">© {new Date().getFullYear()} Instant Catalog. All rights reserved.</p>
            <p className="text-white/20 text-xs">
              Crafted with <i className="fa-solid fa-heart text-brand-magenta/60 mx-1"></i> for businesses that want to grow.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
