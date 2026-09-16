import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Alert from '@/components/Alert';
import PasswordInput from '@/components/PasswordInput';
import { useAuth } from '@/context/AuthContext';
import { apiFetch, ApiError } from '@/utils/api';

// Exact string auth.controller.js's login() throws for status: 'unverified'
// — matched on here (this codebase's errors are message-only, no machine
// code) to decide whether to offer resending the verification code.
const UNVERIFIED_ERROR_MESSAGE = 'Please verify your email before logging in';

export default function Login() {
  const router = useRouter();
  const { login, user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState('');

  // verify-email now logs the vendor straight into the catalog wizard, so
  // this page no longer sits in that path — ?verified=1 only shows up if
  // someone lands here by hand (e.g. an old bookmarked link), in which
  // case a normal login to /dashboard is still the right outcome.
  const justVerified = router.query.verified === '1';

  // Already logged in (e.g. came back to /login manually) — skip
  // straight to the dashboard instead of showing the form again.
  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  const isUnverifiedError = error === UNVERIFIED_ERROR_MESSAGE;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setResendError('');
    setLoading(true);
    try {
      await login(email, password, rememberMe);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Same handoff signup.tsx uses after registering: stash the email (and
  // dev-mode OTP, if Brevo isn't sending) for verify-email.tsx to pick up,
  // then send them straight there instead of leaving them stuck on a login
  // form they can never successfully submit.
  async function handleResend() {
    setResending(true);
    setResendError('');
    try {
      const result = await apiFetch<{ devOtp?: string }>('/auth/resend-verification', {
        method: 'POST',
        body: { email },
      });
      sessionStorage.setItem('qc_verify_email', email);
      if (result.devOtp) {
        sessionStorage.setItem('qc_dev_otp', result.devOtp);
      }
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setResendError(err instanceof ApiError ? err.message : 'Could not resend the code. Please try again.');
    } finally {
      setResending(false);
    }
  }

  return (
    <Layout title="Log in" description="Log in to your Instant Catalog account to manage your catalogs and products." noindex>
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold text-gray-900">Log in</h1>
        <p className="mt-1 text-sm text-gray-600">Welcome back to Instant Catalog.</p>

        {justVerified && (
          <div className="mt-4">
            <Alert variant="success">Your account is verified. You can log in now.</Alert>
          </div>
        )}
        {error && (
          <div className="mt-4">
            <Alert variant="error">
              {error}
              {isUnverifiedError && (
                <>
                  {' '}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending || !email}
                    className="font-medium underline hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {resending ? 'Sending…' : 'Resend verification code'}
                  </button>
                </>
              )}
            </Alert>
          </div>
        )}
        {resendError && (
          <div className="mt-2">
            <Alert variant="error">{resendError}</Alert>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
              placeholder="you@business.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <Link href="/forgot-password" className="text-sm font-medium text-primary-700 hover:text-primary-800">
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              inputClassName="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
              placeholder="••••••••"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-700 focus:ring-primary-700"
            />
            Remember me
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-primary-700 hover:text-primary-800">
            Sign up
          </Link>
        </p>
      </div>
    </Layout>
  );
}
