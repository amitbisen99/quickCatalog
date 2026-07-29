import { FormEvent, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Alert from '@/components/Alert';
import { apiFetch, ApiError } from '@/utils/api';
import { isValidEmail } from '@/utils/validators';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [devResetLink, setDevResetLink] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!isValidEmail(email)) {
      setError('Enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const result = await apiFetch<{ devResetLink?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: { email },
      });
      setDevResetLink(result.devResetLink || '');
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="Forgot password">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold text-gray-900">Forgot password</h1>
        <p className="mt-1 text-sm text-gray-600">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>

        {submitted ? (
          <div className="mt-6 space-y-4">
            <Alert variant="success">
              If an account exists for <strong>{email}</strong>, a password reset link has been sent.
            </Alert>
            {devResetLink && (
              <Alert variant="info">
                Dev mode (no email provider configured yet):{' '}
                <a href={devResetLink} className="font-medium underline">
                  reset link
                </a>
              </Alert>
            )}
            <p className="text-center text-sm text-gray-600">
              <Link href="/auth/login" className="font-medium text-primary-700 hover:text-primary-800">
                Back to login
              </Link>
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mt-4">
                <Alert variant="error">{error}</Alert>
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
                  placeholder="you@business.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600">
              <Link href="/auth/login" className="font-medium text-primary-700 hover:text-primary-800">
                Back to login
              </Link>
            </p>
          </>
        )}
      </div>
    </Layout>
  );
}
