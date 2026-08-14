import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import Alert from '@/components/Alert';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';
import { useAuth, AuthUser } from '@/context/AuthContext';
import { apiFetch, ApiError } from '@/utils/api';
import { isPasswordValid } from '@/utils/validators';
import { BUSINESS_TYPES, INDUSTRIES } from '@/utils/constants';
import { CURRENCIES } from '@/utils/currency';
import { UserIcon, LockIcon, CreditCardIcon, TrashIcon } from '@/components/icons';

function subscriptionLabel(user: AuthUser | null): string {
  if (!user) return '—';
  if (user.subscriptionType !== 'paid') return 'Free plan — 20 catalogs';
  if (!user.subscriptionExpiresAt) return 'Paid plan — unlimited catalogs';
  const daysRemaining = Math.ceil(
    (new Date(user.subscriptionExpiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
  );
  return daysRemaining > 0
    ? `Paid plan — unlimited catalogs (${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left)`
    : 'Paid plan expired';
}

function Settings() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  // Profile form
  const [mobileNo, setMobileNo] = useState('');
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

  useEffect(() => {
    apiFetch<{ user: AuthUser }>('/users/profile').then((res) => {
      setMobileNo(res.user.mobileNo || '');
      setBusinessName(res.user.businessName || '');
      setBusinessType(res.user.businessType || '');
      setIndustry(res.user.industry || '');
      setCurrency(res.user.currency || 'INR');
      setLogoPreview(res.user.logo || '');
      setBannerPreview(res.user.banner || '');
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

          <div>
            <label htmlFor="mobileNo" className="block text-sm font-medium text-gray-700">
              Mobile Number
            </label>
            <input
              id="mobileNo"
              value={mobileNo}
              onChange={(e) => setMobileNo(e.target.value.replace(/[^\d]/g, ''))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
          </div>

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
        <button
          type="button"
          disabled
          title="Coming soon"
          className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
        >
          Upgrade (coming soon)
        </button>
      </section>

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
    </DashboardLayout>
  );
}

export default withAuth(Settings);
