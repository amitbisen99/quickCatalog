import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import Alert from '@/components/Alert';
import { apiFetch, ApiError } from '@/utils/api';
import { BUSINESS_TYPES, INDUSTRIES } from '@/utils/constants';
import { useAuth } from '@/context/AuthContext';

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmail() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [email, setEmail] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [otp, setOtp] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [industry, setIndustry] = useState('');

  const [cooldown, setCooldown] = useState(0);
  const [formError, setFormError] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const queryEmail = typeof router.query.email === 'string' ? router.query.email : '';
    const storedEmail = sessionStorage.getItem('qc_verify_email') || '';
    setEmail(queryEmail || storedEmail);
    setDevOtp(sessionStorage.getItem('qc_dev_otp') || '');
  }, [router.query.email]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const otpComplete = /^\d{6}$/.test(otp);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!otpComplete) {
      setFormError('Enter the 6-digit verification code');
      return;
    }
    if (!businessName.trim() || !businessType || !industry) {
      setFormError('Fill in your business details to continue');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/auth/verify-email', {
        method: 'POST',
        body: { email, otp, businessName, businessType, industry },
      });
      sessionStorage.removeItem('qc_verify_email');
      sessionStorage.removeItem('qc_dev_otp');
      // verify-email now logs the vendor in directly (same cookies login()
      // sets) — pull that session into AuthContext so the dashboard sees
      // an authenticated user immediately, no separate login step. Lands
      // on the Catalogs screen (not /create-catalog, the standalone
      // pre-login wizard) — "Create Catalog" → "Import File" there runs
      // the same guided flow inside the vendor panel.
      await refreshUser();
      router.push('/dashboard/catalogs');
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || !email) return;
    setResendMessage('');
    setFormError('');
    setResending(true);
    try {
      const result = await apiFetch<{ devOtp?: string }>('/auth/resend-verification', {
        method: 'POST',
        body: { email },
      });
      setDevOtp(result.devOtp || '');
      if (result.devOtp) sessionStorage.setItem('qc_dev_otp', result.devOtp);
      setResendMessage('A new verification code has been sent to your email.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not resend the code. Please try again.');
    } finally {
      setResending(false);
    }
  }

  return (
    <Layout title="Verify your email">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold text-gray-900">Verify your email</h1>
        <p className="mt-1 text-sm text-gray-600">
          {email ? (
            <>
              Enter the 6-digit code we sent to <span className="font-medium">{email}</span>.
            </>
          ) : (
            'Enter the 6-digit code we sent to your email.'
          )}
        </p>

        {devOtp && (
          <div className="mt-4">
            <Alert variant="info">
              Dev mode (no email provider configured yet): your code is <strong>{devOtp}</strong>.
            </Alert>
          </div>
        )}
        {formError && (
          <div className="mt-4">
            <Alert variant="error">{formError}</Alert>
          </div>
        )}
        {resendMessage && (
          <div className="mt-4">
            <Alert variant="success">{resendMessage}</Alert>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
              Verification code
            </label>
            <input
              id="otp"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-lg tracking-[0.5em] focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
              placeholder="••••••"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Didn&apos;t receive it?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
              className="font-medium text-primary-700 hover:text-primary-800 disabled:cursor-not-allowed disabled:text-gray-400"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Resending…' : 'Resend code'}
            </button>
          </div>

          {otpComplete && (
            <div className="space-y-4 border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-700">Tell us about your business</p>

              <div>
                <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
                  Business Name
                </label>
                <input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
                  placeholder="Acme Textiles Pvt. Ltd."
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
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
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
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
                >
                  <option value="">Select industry</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !otpComplete}
            className="w-full rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Verifying…' : 'Verify & continue'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
