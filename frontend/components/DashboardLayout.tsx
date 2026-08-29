import { ReactNode, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import UpgradePlanModal from '@/components/dashboard/UpgradePlanModal';
import { isFreePlan } from '@/utils/planLimit';
import {
  HomeIcon,
  GridIcon,
  BoxIcon,
  TagIcon,
  ListIcon,
  MailIcon,
  ChartBarIcon,
  HelpIcon,
  SlidersIcon,
  LogoutIcon,
  ChevronDownIcon,
  LayoutIcon,
  DotsIcon,
  XIcon,
} from '@/components/icons';

// Full nav, used as-is by the desktop sidebar.
const NAV_GROUPS: { label: string | null; items: { label: string; href: string; icon: typeof HomeIcon }[] }[] = [
  { label: null, items: [{ label: 'Dashboard', href: '/dashboard', icon: HomeIcon }] },
  {
    label: 'Catalog',
    items: [
      { label: 'Catalogs', href: '/dashboard/catalogs', icon: GridIcon },
      { label: 'Templates', href: '/dashboard/templates', icon: LayoutIcon },
      { label: 'Products', href: '/dashboard/products', icon: BoxIcon },
      { label: 'Categories', href: '/dashboard/categories', icon: TagIcon },
      { label: 'Specifications', href: '/dashboard/specifications', icon: ListIcon },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { label: 'Enquiries', href: '/dashboard/enquiries', icon: MailIcon },
      { label: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon },
    ],
  },
  {
    label: null,
    items: [
      { label: 'Support', href: '/dashboard/support', icon: HelpIcon },
      { label: 'Settings', href: '/dashboard/settings', icon: SlidersIcon },
    ],
  },
];

// The mobile bottom tab bar only has room for a handful of destinations —
// these are the ones a vendor reaches for constantly. Everything else
// (Templates, Categories, Specifications, Analytics, Support, Settings)
// lives one tap away behind "More", which opens as a bottom sheet rather
// than a side drawer to match the tab bar's own bottom-anchored feel.
const PRIMARY_TABS: { label: string; href: string; icon: typeof HomeIcon }[] = [
  { label: 'Home', href: '/dashboard', icon: HomeIcon },
  { label: 'Catalogs', href: '/dashboard/catalogs', icon: GridIcon },
  { label: 'Products', href: '/dashboard/products', icon: BoxIcon },
  { label: 'Enquiries', href: '/dashboard/enquiries', icon: MailIcon },
];

const MORE_GROUPS: { label: string | null; items: { label: string; href: string; icon: typeof HomeIcon }[] }[] = [
  {
    label: 'Catalog',
    items: [
      { label: 'Templates', href: '/dashboard/templates', icon: LayoutIcon },
      { label: 'Categories', href: '/dashboard/categories', icon: TagIcon },
      { label: 'Specifications', href: '/dashboard/specifications', icon: ListIcon },
    ],
  },
  {
    label: 'Engagement',
    items: [{ label: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon }],
  },
  {
    label: null,
    items: [
      { label: 'Support', href: '/dashboard/support', icon: HelpIcon },
      { label: 'Settings', href: '/dashboard/settings', icon: SlidersIcon },
    ],
  },
];

interface Props {
  title?: string;
  children: ReactNode;
}

export default function DashboardLayout({ title, children }: Props) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const vendorName = user?.businessName || user?.email || '';
  const moreActive = MORE_GROUPS.some((g) => g.items.some((i) => i.href === router.pathname));

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  function NavLinks() {
    return (
      <>
        {NAV_GROUPS.map((group, i) => (
          <div key={i} className={i > 0 ? 'mt-6' : ''}>
            {group.label && (
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{group.label}</p>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = router.pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
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
          </div>
        ))}
      </>
    );
  }

  const pageLabel = title || 'Dashboard';

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>{title ? `${title} | Instant Catalog` : 'Instant Catalog'}</title>
      </Head>

      <div className="flex min-h-screen">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
          <div className="flex items-center px-5 py-6">
            {/* Instant Catalog's own full lockup by default — completely
                replaced by the vendor's own uploaded logo once they set
                one, not combined with it. Height-constrained with
                object-contain so either shape (this wide lockup, or a
                vendor's typically-square logo) renders at its own natural
                width without distortion. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user?.logo || '/logo-full.svg'}
              alt={user?.logo ? vendorName : 'Instant Catalog'}
              className="h-8 w-auto max-w-[180px] object-contain"
            />
          </div>
          <nav className="flex-1 overflow-y-auto px-3 pb-4">
            <NavLinks />
          </nav>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between px-4 py-3.5 sm:px-6">
              <span className="text-lg font-semibold text-gray-900">{pageLabel}</span>

              <div className="flex items-center gap-3">
                {isFreePlan(user) && (
                  <button
                    onClick={() => setUpgradeModalOpen(true)}
                    className="rounded-lg bg-secondary-500 px-3 py-1.5 text-xs font-semibold text-primary-900 hover:bg-secondary-600 sm:px-4 sm:py-2 sm:text-sm"
                  >
                    Upgrade Plan
                  </button>
                )}

                <div className="relative">
                  <button
                    onClick={() => setAvatarMenuOpen((open) => !open)}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white">
                      {/* Vendor's own uploaded logo once they set one in
                          Settings — the default brand mark until then,
                          never text initials. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={user?.logo || '/icons/icon.svg'} alt={vendorName} className="h-full w-full object-cover" />
                    </div>
                    <span className="hidden text-sm font-medium text-gray-700 sm:inline">{vendorName}</span>
                    <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                  </button>

                  {avatarMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setAvatarMenuOpen(false)} />
                      <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                        <Link
                          href="/dashboard/settings"
                          onClick={() => setAvatarMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Settings
                        </Link>
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
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 pb-24 pt-8 sm:px-6 lg:pb-8">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </div>

      {/* Bottom tab bar (mobile/tablet) — the vendor-app-as-native-app nav.
          Replaces the old side drawer; "More" opens a bottom sheet for
          everything that doesn't fit here. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Primary"
      >
        <div className="flex items-stretch justify-around">
          {PRIMARY_TABS.map((item) => {
            const active = router.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium"
              >
                <Icon className={`h-6 w-6 ${active ? 'text-primary-700' : 'text-gray-400'}`} />
                <span className={active ? 'text-primary-700' : 'text-gray-500'}>{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreSheetOpen(true)}
            aria-label="More"
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium"
          >
            <DotsIcon className={`h-6 w-6 ${moreActive ? 'text-primary-700' : 'text-gray-400'}`} />
            <span className={moreActive ? 'text-primary-700' : 'text-gray-500'}>More</span>
          </button>
        </div>
      </nav>

      {/* "More" bottom sheet */}
      {moreSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMoreSheetOpen(false)} />
          <div className="relative flex max-h-[80vh] w-full flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={user?.logo || '/icons/icon.svg'} alt={vendorName} className="h-full w-full object-cover" />
                </div>
                <span className="text-sm font-semibold text-gray-900">{vendorName}</span>
              </div>
              <button
                onClick={() => setMoreSheetOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-3 py-3">
              {MORE_GROUPS.map((group, i) => (
                <div key={i} className={i > 0 ? 'mt-4' : ''}>
                  {group.label && (
                    <p className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      {group.label}
                    </p>
                  )}
                  <div className="flex flex-col gap-0.5">
                    {group.items.map((item) => {
                      const active = router.pathname === item.href;
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMoreSheetOpen(false)}
                          className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${
                            active ? 'bg-primary-50 font-semibold text-primary-800' : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-primary-700' : 'text-gray-400'}`} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 p-3">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700"
              >
                <LogoutIcon className="h-5 w-5 shrink-0" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <UpgradePlanModal isOpen={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} reason="generic" />
    </div>
  );
}
