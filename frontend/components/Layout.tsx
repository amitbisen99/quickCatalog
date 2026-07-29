import { ReactNode, useState } from 'react';
import Head from 'next/head';

interface LayoutProps {
  title?: string;
  children: ReactNode;
}

/**
 * Generic, responsive page shell shared across the app. Dashboard/admin/
 * public sections wrap this with their own nav (added in later phases)
 * rather than duplicating the header/footer chrome.
 */
export default function Layout({ title, children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Head>
        <title>{title ? `${title} | QuickCatalog` : 'QuickCatalog'}</title>
      </Head>

      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <span className="text-lg font-semibold text-primary-700">QuickCatalog</span>

          <button
            type="button"
            className="rounded-md p-2 text-gray-600 hover:bg-gray-100 sm:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileMenuOpen ? (
                <path d="M6 6l12 12M18 6l-12 12" strokeLinecap="round" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              )}
            </svg>
          </button>

          <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 sm:flex">
            <a href="/" className="hover:text-primary-700">Home</a>
            <a href="/auth/login" className="hover:text-primary-700">Login</a>
            <a href="/auth/signup" className="rounded-lg bg-primary-700 px-4 py-2 text-white hover:bg-primary-800">
              Get started
            </a>
          </nav>
        </div>

        {mobileMenuOpen && (
          <nav className="flex flex-col gap-1 border-t border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-600 sm:hidden">
            <a href="/" className="rounded-md px-3 py-2 hover:bg-gray-100">Home</a>
            <a href="/auth/login" className="rounded-md px-3 py-2 hover:bg-gray-100">Login</a>
            <a href="/auth/signup" className="rounded-md px-3 py-2 hover:bg-gray-100">Get started</a>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>

      <footer className="border-t border-gray-200 bg-white py-6 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} QuickCatalog. All rights reserved.
      </footer>
    </div>
  );
}
