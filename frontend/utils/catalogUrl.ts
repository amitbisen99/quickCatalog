import type { AuthUser } from '@/context/AuthContext';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010';
const APP_BASE_DOMAIN = (() => {
  try {
    return new URL(APP_URL).hostname;
  } catch {
    return 'instantcatalog.app';
  }
})();

/**
 * The public URL a catalog should actually be shared/linked with. Once a
 * vendor has an active white-label domain, every catalog they own should
 * point there instead of the shared instantcatalog.app link — this is the
 * one place that decision is made, so every "view catalog" / "share" /
 * "copy link" surface stays consistent. If a vendor somehow has both an
 * active custom domain and an active subdomain, the custom domain is
 * preferred as the more "final" branded address (both still resolve
 * correctly if visited directly — this only affects which one gets shown).
 */
export function getCatalogPublicUrl(slug: string, user: AuthUser | null | undefined): string {
  if (user?.customDomainStatus === 'active' && user.customDomain) {
    return `https://${user.customDomain}/public/${slug}`;
  }
  if (user?.subdomainStatus === 'active' && user.subdomain) {
    return `https://${user.subdomain}.${APP_BASE_DOMAIN}/public/${slug}`;
  }
  return `${APP_URL}/public/${slug}`;
}
