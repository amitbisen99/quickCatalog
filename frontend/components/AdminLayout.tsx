import { ReactNode, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAdminAuth } from '@/context/AdminAuthContext';
import {
  HomeIcon,
  UserIcon,
  HelpIcon,
  CreditCardIcon,
  ListIcon,
  ShareIcon,
  LogoutIcon,
  MenuIcon,
  XIcon,
  ChevronDownIcon,
} from '@/components/icons';

// Mirrors DashboardLayout.tsx (vendor panel) but for the admin panel —
// separate nav list, separate session (useAdminAuth), no "Settings" link
// since there's no admin settings page yet.
const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon },
  { label: 'Vendors', href: '/admin/vendors', icon: UserIcon },
  { label: 'Domain Requests', href: '/admin/domain-requests', icon: ShareIcon },
  { label: 'Support Tickets', href: '/admin/support-tickets', icon: HelpIcon },
  { label: 'Payments', href: '/admin/payments', icon: ListIcon },
  { label: 'Plan Pricing', href: '/admin/plan-pricing', icon: CreditCardIcon },
];

interface Props {
  title?: string;
  children: ReactNode;
}

export default function AdminLayout({ title, children }: Props) {
  const { admin, logout } = useAdminAuth();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    router.push('/admin');
  }

  function NavLinks() {
    return (
      <div className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = router.pathname === item.href || router.pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileNavOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active ? 'bg-primary-50 font-semibold text-primary-800' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-primary-700' : 'text-gray-400'}`} />
              {item.label}
            </Link>
          );
        })}
      </div>
    );
  }

  const pageLabel = title || 'Admin';

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>{title ? `${title} | Instant Catalog Admin` : 'Instant Catalog Admin'}</title>
      </Head>

      <div className="flex min-h-screen">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
          <div className="flex items-center gap-2.5 px-5 py-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-700 text-sm font-bold text-secondary-500">
              I
            </div>
            <span className="text-lg font-bold text-gray-900">Instant Catalog Admin</span>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 pb-4">
            <NavLinks />
          </nav>
        </aside>

        {/* Mobile sidebar drawer */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
            <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-white">
              <div className="flex items-center justify-between px-5 py-6">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-700 text-sm font-bold text-secondary-500">
                    I
                  </div>
                  <span className="text-lg font-bold text-gray-900">Instant Catalog Admin</span>
                </div>
                <button
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Close menu"
                  className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-3 pb-4">
                <NavLinks />
              </nav>
              <div className="border-t border-gray-200 p-3">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700"
                >
                  <LogoutIcon className="h-5 w-5 shrink-0" />
                  Logout
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between px-4 py-3.5 sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-md p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
                  aria-label="Toggle menu"
                  aria-expanded={mobileNavOpen}
                  onClick={() => setMobileNavOpen((open) => !open)}
                >
                  <MenuIcon className="h-6 w-6" />
                </button>
                <span className="text-lg font-semibold text-gray-900">{pageLabel}</span>
              </div>

              <div className="relative">
                <button
                  onClick={() => setAvatarMenuOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-700 text-xs font-semibold text-white">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <span className="hidden text-sm font-medium text-gray-700 sm:inline">{admin?.email}</span>
                  <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                </button>

                {avatarMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setAvatarMenuOpen(false)} />
                    <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogoutIcon className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-8 sm:px-6">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
