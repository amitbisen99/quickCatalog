import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import Alert from '@/components/Alert';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';
import MobileNumberInput from '@/components/MobileNumberInput';
import UpgradePlanModal from '@/components/dashboard/UpgradePlanModal';
import { FREE_CATALOG_LIMIT, FREE_PRODUCT_LIMIT, isFreePlan } from '@/utils/planLimit';
import { useAuth, AuthUser } from '@/context/AuthContext';
import { apiFetch, ApiError } from '@/utils/api';
import { isPasswordValid } from '@/utils/validators';
import { BUSINESS_TYPES, INDUSTRIES } from '@/utils/constants';
import { CURRENCIES } from '@/utils/currency';
import { DEFAULT_COUNTRY_CODE } from '@/utils/countries';
import {
  UserIcon,
  LockIcon,
  CreditCardIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShareIcon,
} from '@/components/icons';

type DomainStatus = 'pending' | 'active' | 'failed';

interface CatalogSummary {
  id: string;
  name: string;
  slug: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010';
// The bare domain the app is deployed on — used to build the preview of
// what a requested subdomain will look like (`{value}.{APP_BASE_DOMAIN}`).
// Falls back to parsing it out of APP_URL so this doesn't need its own
// separate env var kept in sync with NEXT_PUBLIC_APP_URL.
const APP_BASE_DOMAIN = (() => {
  try {
    return new URL(APP_URL).hostname;
  } catch {
    return 'instantcatalog.app';
  }
})();

function subscriptionLabel(user: AuthUser | null): string {
  if (!user) return '—';
  if (isFreePlan(user)) return `Free plan — ${FREE_CATALOG_LIMIT} catalog, ${FREE_PRODUCT_LIMIT} products`;
  if (!user.subscriptionExpiresAt) return 'Paid plan — unlimited catalogs & products';
  const daysRemaining = Math.ceil(
    (new Date(user.subscriptionExpiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
  );
  return daysRemaining > 0
    ? `Paid plan — unlimited catalogs & products (${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left)`
    : 'Paid plan expired';
}

function Settings() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  // Profile form
  const [mobileNo, setMobileNo] = useState('');
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [industry, setIndustry] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [logoPreview, setLogoPreview] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Danger zone
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Subscription
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  // White-label domain — vendor-scoped, not per-catalog: once active,
  // every catalog this vendor owns is reachable at `{domain}/public/{slug}`.
  const [subdomain, setSubdomain] = useState<string | undefined>();
  const [subdomainStatus, setSubdomainStatus] = useState<DomainStatus | undefined>();
  const [subdomainInput, setSubdomainInput] = useState('');
  const [savingSubdomain, setSavingSubdomain] = useState(false);
  const [subdomainError, setSubdomainError] = useState('');
  const [customDomain, setCustomDomain] = useState<string | undefined>();
  const [customDomainStatus, setCustomDomainStatus] = useState<DomainStatus | undefined>();
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [savingCustomDomain, setSavingCustomDomain] = useState(false);
  const [customDomainError, setCustomDomainError] = useState('');
  const [primaryCatalogId, setPrimaryCatalogId] = useState('');
  const [savingPrimaryCatalog, setSavingPrimaryCatalog] = useState(false);
  const [catalogs, setCatalogs] = useState<CatalogSummary[]>([]);
  const [domainUpgradeModalOpen, setDomainUpgradeModalOpen] = useState(false);

  useEffect(() => {
    apiFetch<{ user: AuthUser }>('/users/profile').then((res) => {
      setMobileNo(res.user.mobileNo || '');
      setCountryCode(res.user.countryCode || DEFAULT_COUNTRY_CODE);
      setBusinessName(res.user.businessName || '');
      setBusinessType(res.user.businessType || '');
      setIndustry(res.user.industry || '');
      setCurrency(res.user.currency || 'INR');
      setLogoPreview(res.user.logo || '');
      setBannerPreview(res.user.banner || '');
      setSubdomain(res.user.subdomain);
      setSubdomainStatus(res.user.subdomainStatus);
      setCustomDomain(res.user.customDomain);
      setCustomDomainStatus(res.user.customDomainStatus);
      setPrimaryCatalogId(res.user.primaryCatalogId || '');
    });
    apiFetch<{ catalogs: CatalogSummary[] }>('/catalogs')
      .then((res) => setCatalogs(res.catalogs))
      .catch(() => {
        // Non-fatal — the primary-catalog picker just stays empty.
      });
  }, []);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  }

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  }

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileLoading(true);
    try {
      const formData = new FormData();
      formData.append('mobileNo', mobileNo);
      formData.append('countryCode', countryCode);
      formData.append('businessName', businessName);
      formData.append('businessType', businessType);
      formData.append('industry', industry);
      formData.append('currency', currency);
      if (logoFile) formData.append('logo', logoFile);
      if (bannerFile) formData.append('banner', bannerFile);

      await apiFetch('/users/profile', { method: 'PUT', formData });
      await refreshUser();
      setLogoFile(null);
      setBannerFile(null);
      setProfileSuccess('Profile updated successfully');
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!isPasswordValid(newPassword)) {
      setPasswordError('New password does not meet the requirements below');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      await apiFetch('/users/change-password', {
        method: 'PUT',
        body: { currentPassword, newPassword, confirmPassword },
      });
      setPasswordSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteError('');
    try {
      await apiFetch('/users/account', { method: 'DELETE' });
      router.push('/login');
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  }

  async function handleSetSubdomain(e: FormEvent) {
    e.preventDefault();
    setSubdomainError('');
    setSavingSubdomain(true);
    try {
      const res = await apiFetch<{ user: AuthUser }>('/users/subdomain', {
        method: 'PUT',
        body: { subdomain: subdomainInput },
      });
      setSubdomain(res.user.subdomain);
      setSubdomainStatus(res.user.subdomainStatus);
      setSubdomainInput('');
    } catch (err) {
      setSubdomainError(err instanceof ApiError ? err.message : 'Could not request that subdomain. Please try again.');
    } finally {
      setSavingSubdomain(false);
    }
  }

  async function handleRemoveSubdomain() {
    if (!window.confirm('Remove your subdomain?')) return;
    try {
      const res = await apiFetch<{ user: AuthUser }>('/users/subdomain', { method: 'DELETE' });
      setSubdomain(res.user.subdomain);
      setSubdomainStatus(res.user.subdomainStatus);
    } catch (err) {
      setSubdomainError(err instanceof ApiError ? err.message : 'Could not remove the subdomain.');
    }
  }

  async function handleSetCustomDomain(e: FormEvent) {
    e.preventDefault();
    if (isFreePlan(user)) {
      setDomainUpgradeModalOpen(true);
      return;
    }
    setCustomDomainError('');
    setSavingCustomDomain(true);
    try {
      const res = await apiFetch<{ user: AuthUser }>('/users/custom-domain', {
        method: 'PUT',
        body: { customDomain: customDomainInput },
      });
      setCustomDomain(res.user.customDomain);
      setCustomDomainStatus(res.user.customDomainStatus);
      setCustomDomainInput('');
    } catch (err) {
      setCustomDomainError(err instanceof ApiError ? err.message : 'Could not connect that domain. Please try again.');
    } finally {
      setSavingCustomDomain(false);
    }
  }

  async function handleRemoveCustomDomain() {
    if (!window.confirm('Disconnect this domain?')) return;
    try {
      const res = await apiFetch<{ user: AuthUser }>('/users/custom-domain', { method: 'DELETE' });
      setCustomDomain(res.user.customDomain);
      setCustomDomainStatus(res.user.customDomainStatus);
    } catch (err) {
      setCustomDomainError(err instanceof ApiError ? err.message : 'Could not disconnect the domain.');
    }
  }

  async function handlePrimaryCatalogChange(catalogId: string) {
    setPrimaryCatalogId(catalogId);
    setSavingPrimaryCatalog(true);
    try {
      await apiFetch('/users/primary-catalog', { method: 'PUT', body: { catalogId } });
    } catch (err) {
      setSubdomainError(err instanceof ApiError ? err.message : 'Could not update your primary catalog.');
    } finally {
      setSavingPrimaryCatalog(false);
    }
  }

  return (
    <DashboardLayout title="Settings">
      <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
      <p className="mt-1.5 text-base text-gray-500">Manage your profile, security, and subscription.</p>

      {/* Profile */}
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
            <UserIcon className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Profile</h2>
        </div>

        {profileError && (
          <div className="mt-4">
            <Alert variant="error">{profileError}</Alert>
          </div>
        )}
        {profileSuccess && (
          <div className="mt-4">
            <Alert variant="success">{profileSuccess}</Alert>
          </div>
        )}

        <form className="mt-4 space-y-4" onSubmit={handleProfileSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              readOnly
              disabled
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
            />
          </div>

          <MobileNumberInput
            countryCode={countryCode}
            mobileNo={mobileNo}
            onCountryCodeChange={setCountryCode}
            onMobileNoChange={setMobileNo}
            focusClassName="focus:border-primary-600 focus:ring-primary-600"
          />

          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
              Business Name
            </label>
            <input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
          </div>

          <div>
            <label htmlFor="businessType" className="block text-sm font-medium text-gray-700">
              Business Type
            </label>
            <select
              id="businessType"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            >
              <option value="">Select business type</option>
              {BUSINESS_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="industry" className="block text-sm font-medium text-gray-700">
              Industry
            </label>
            <select
              id="industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            >
              <option value="">Select industry</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
              Currency
            </label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">Used for every price shown in your dashboard and public catalogs.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Logo</label>
            <div className="mt-1 flex items-center gap-4">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="Logo preview" className="h-16 w-16 rounded-lg object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
                  No logo
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleLogoChange} className="text-sm text-gray-600" />
            </div>
            <p className="mt-1 text-xs text-gray-400">Recommended: square, at least 200 × 200px. JPG or PNG, max 5MB.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Catalog Banner</label>
            <div className="mt-1">
              {bannerPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bannerPreview} alt="Banner preview" className="h-28 w-full max-w-md rounded-lg object-cover" />
              ) : (
                <div className="flex h-28 w-full max-w-md items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
                  No banner
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleBannerChange} className="mt-2 text-sm text-gray-600" />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Shown as the background of your public catalog page header. Recommended: 1600 × 500px (wide banner), JPG or PNG, max 5MB.
            </p>
          </div>

          <button
            type="submit"
            disabled={profileLoading}
            className="rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {profileLoading ? 'Saving…' : 'Save'}
          </button>
        </form>
      </section>

      {/* Account / password */}
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
            <LockIcon className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Account</h2>
        </div>

        {passwordError && (
          <div className="mt-4">
            <Alert variant="error">{passwordError}</Alert>
          </div>
        )}
        {passwordSuccess && (
          <div className="mt-4">
            <Alert variant="success">{passwordSuccess}</Alert>
          </div>
        )}

        <form className="mt-4 space-y-4" onSubmit={handlePasswordSubmit}>
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
            <PasswordStrengthMeter password={newPassword} />
          </div>
          <div>
            <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <input
              id="confirmNewPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {passwordLoading ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      </section>

      {/* Subscription */}
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary-100 text-secondary-700">
            <CreditCardIcon className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Subscription</h2>
        </div>
        <p className="mt-3 text-sm text-gray-600">{subscriptionLabel(user)}</p>
        {isFreePlan(user) && (
          <button
            type="button"
            onClick={() => setUpgradeModalOpen(true)}
            className="mt-4 rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800"
          >
            Upgrade to Paid
          </button>
        )}
      </section>

      {/* White-label domain */}
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
            <ShareIcon className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">White-label Domain</h2>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          Show every catalog you own under your own address instead of our shared link — once set up,{' '}
          {catalogs[0] ? `${APP_URL.replace(/^https?:\/\//, '')}/public/${catalogs[0].slug}` : 'your catalog links'} become
          reachable the same way from your domain too.
        </p>

        <div className="mt-5 border-t border-gray-100 pt-5">
          <p className="text-sm font-medium text-gray-700">Branded subdomain</p>
          {subdomain ? (
            <div className="mt-2 flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {subdomain}.{APP_BASE_DOMAIN}
                </p>
                {subdomainStatus === 'active' ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-green-700">
                    <CheckCircleIcon className="h-3.5 w-3.5" /> Live
                  </p>
                ) : subdomainStatus === 'failed' ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                    <ExclamationTriangleIcon className="h-3.5 w-3.5" /> Setup failed — contact support
                  </p>
                ) : (
                  <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                    <ExclamationTriangleIcon className="h-3.5 w-3.5" /> Pending — we&apos;re setting this up
                  </p>
                )}
              </div>
              <button
                onClick={handleRemoveSubdomain}
                className="shrink-0 text-xs font-medium text-gray-400 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          ) : (
            <form onSubmit={handleSetSubdomain} className="mt-2">
              <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center rounded-lg border border-gray-300 focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600">
                  <input
                    value={subdomainInput}
                    onChange={(e) => setSubdomainInput(e.target.value)}
                    placeholder="yourbrand"
                    className="w-full rounded-l-lg px-3 py-2 text-sm focus:outline-none"
                  />
                  <span className="shrink-0 pr-3 text-sm text-gray-400">.{APP_BASE_DOMAIN}</span>
                </div>
                <button
                  type="submit"
                  disabled={savingSubdomain || !subdomainInput.trim()}
                  className="shrink-0 rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50"
                >
                  {savingSubdomain ? 'Requesting…' : 'Request'}
                </button>
              </div>
              {subdomainError && <p className="mt-2 text-xs text-red-600">{subdomainError}</p>}
            </form>
          )}
        </div>

        <div className="mt-5 border-t border-gray-100 pt-5">
          <p className="text-sm font-medium text-gray-700">Custom domain</p>
          {isFreePlan(user) && !customDomain ? (
            <button
              onClick={() => setDomainUpgradeModalOpen(true)}
              className="mt-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Upgrade to connect your own domain
            </button>
          ) : customDomain ? (
            <div className="mt-2 flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{customDomain}</p>
                {customDomainStatus === 'active' ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-green-700">
                    <CheckCircleIcon className="h-3.5 w-3.5" /> Live
                  </p>
                ) : customDomainStatus === 'failed' ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                    <ExclamationTriangleIcon className="h-3.5 w-3.5" /> Setup failed — contact support
                  </p>
                ) : (
                  <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                    <ExclamationTriangleIcon className="h-3.5 w-3.5" /> Pending — we&apos;re setting this up
                  </p>
                )}
              </div>
              <button
                onClick={handleRemoveCustomDomain}
                className="shrink-0 text-xs font-medium text-gray-400 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          ) : (
            <form onSubmit={handleSetCustomDomain} className="mt-2">
              <div className="flex items-center gap-2">
                <input
                  value={customDomainInput}
                  onChange={(e) => setCustomDomainInput(e.target.value)}
                  placeholder="catalog.yourbrand.com"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                />
                <button
                  type="submit"
                  disabled={savingCustomDomain || !customDomainInput.trim()}
                  className="shrink-0 rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50"
                >
                  {savingCustomDomain ? 'Connecting…' : 'Connect'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Point a CNAME (or A record for a root domain) at our hosting — we&apos;ll confirm once it&apos;s set up.
              </p>
              {customDomainError && <p className="mt-2 text-xs text-red-600">{customDomainError}</p>}
            </form>
          )}
        </div>

        {catalogs.length > 1 && (subdomain || customDomain) && (
          <div className="mt-5 border-t border-gray-100 pt-5">
            <label htmlFor="primaryCatalog" className="block text-sm font-medium text-gray-700">
              Primary catalog
            </label>
            <p className="mt-1 text-xs text-gray-500">
              Which catalog visitors see when they go straight to your domain with no specific link.
            </p>
            <select
              id="primaryCatalog"
              value={primaryCatalogId}
              onChange={(e) => handlePrimaryCatalogChange(e.target.value)}
              disabled={savingPrimaryCatalog}
              className="mt-2 w-full max-w-sm rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 disabled:opacity-50"
            >
              {catalogs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      <UpgradePlanModal isOpen={domainUpgradeModalOpen} onClose={() => setDomainUpgradeModalOpen(false)} reason="domain" />

      {/* Danger zone */}
      <section className="mt-6 rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-700">
            <TrashIcon className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-semibold text-red-700">Danger Zone</h2>
        </div>
        <p className="mt-3 text-sm text-gray-600">Permanently delete your account and all associated data.</p>

        {deleteError && (
          <div className="mt-4">
            <Alert variant="error">{deleteError}</Alert>
          </div>
        )}

        {confirmingDelete ? (
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-gray-700">Are you sure? This cannot be undone.</span>
            <button
              onClick={handleDeleteAccount}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Yes, delete my account
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="mt-4 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Delete Account
          </button>
        )}
      </section>

      <UpgradePlanModal isOpen={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} reason="generic" />
    </DashboardLayout>
  );
}

export default withAuth(Settings);
