import type { PublicCatalogInfo, PublicVendorInfo } from '@/types/publicCatalog';
import { initialsOf, truncateWords } from './shared';
import { playfairDisplay } from '@/utils/fonts';

interface Props {
  catalog: PublicCatalogInfo;
  vendor: PublicVendorInfo;
  productsCount: number;
  // 'dark' (default) is the original navy/gold hero used by Modern Grid.
  // 'light' is a cream/forest-green variant so a template can look
  // distinct from Modern Grid right from the top of the page.
  theme?: 'dark' | 'light';
}

const THEME = {
  dark: {
    wrapper: 'bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950',
    overlay: 'bg-gradient-to-br from-primary-950/90 via-primary-900/80 to-primary-950/90',
    decor: true,
    border: '',
    // Solid white, not a translucent wash — a vendor's logo is usually a
    // transparent PNG, and against bg-white/10 over this dark navy hero
    // it was rendering as a near-invisible dark box. A plain white card
    // (same idea the 'light' theme already used) keeps any logo, light
    // or dark, clearly visible regardless of the hero's own colors.
    logoBox: 'border-white/20 bg-white',
    logoFallbackText: 'text-primary-700',
    vendorLabel: 'text-white/70',
    title: 'text-white',
    titleFont: '',
    description: 'text-white/70',
    pill: 'bg-white/10 text-white/80 ring-1 ring-white/15',
    pillDot: 'bg-secondary-400',
  },
  light: {
    // Solid gold fallback (no banner) and a matching translucent gold wash
    // over any banner photo — keeps the (white) text readable no matter
    // how busy the photo is, while still letting it show through.
    wrapper: 'bg-[#C7A857]',
    overlay: 'bg-[#c7a857ad]',
    decor: false,
    border: 'border-b border-white/20',
    logoBox: 'border-white/40 bg-white',
    logoFallbackText: 'text-[#C7A857]',
    vendorLabel: 'text-white/85',
    title: 'text-white',
    titleFont: playfairDisplay.className,
    description: 'text-white/85',
    pill: 'bg-white/15 text-white ring-1 ring-white/25',
    pillDot: 'bg-[#1B2E22]',
  },
} as const;

// The banner/logo/title header every catalog template shares — kept in
// one place so switching templates never changes this part of the page
// (only the theme colors do).
export default function CatalogHero({ catalog, vendor, productsCount, theme = 'dark' }: Props) {
  const vendorName = vendor.businessName || catalog.name;
  const t = THEME[theme];

  return (
    <div
      className={`relative overflow-hidden bg-cover bg-center ${t.wrapper} ${t.border}`}
      style={vendor.banner ? { backgroundImage: `url(${vendor.banner})` } : undefined}
    >
      {/* Overlay: keeps text readable over any banner image while still
          letting it show through — falls back to a plain wash (via the
          container's own background classes) when there's no banner. */}
      {vendor.banner && t.overlay && <div className={`absolute inset-0 ${t.overlay}`} />}
      {t.decor && (
        <>
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-secondary-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-primary-400/10 blur-3xl" />
        </>
      )}

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex items-center gap-3">
          <div className={`flex h-[50px] w-[120px] shrink-0 items-center justify-center overflow-hidden rounded-lg border ${t.logoBox}`}>
            {vendor.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vendor.logo} alt={vendorName} className="h-full w-full object-contain p-1.5" />
            ) : (
              <span className={`text-sm font-bold ${t.logoFallbackText}`}>{initialsOf(vendorName)}</span>
            )}
          </div>
          <span className={`text-sm font-semibold uppercase tracking-wide ${t.vendorLabel}`}>{vendorName}</span>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <h1 className={`max-w-xl text-3xl font-bold tracking-tight sm:text-4xl ${t.title} ${t.titleFont}`}>
            {catalog.name}
          </h1>
          <div className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium ${t.pill}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${t.pillDot}`} />
            {productsCount} product{productsCount === 1 ? '' : 's'} available
          </div>
        </div>
        {catalog.description && (
          <p className={`mt-3 max-w-3xl whitespace-pre-line text-sm leading-relaxed sm:text-base ${t.description}`}>
            {truncateWords(catalog.description, 100)}
          </p>
        )}
      </div>
    </div>
  );
}
