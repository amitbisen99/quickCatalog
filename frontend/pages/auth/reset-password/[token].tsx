import { FormEvent, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Alert from '@/components/Alert';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';
import { apiFetch, ApiError } from '@/utils/api';
import { isPasswordValid } from '@/utils/validators';

export default function ResetPassword() {
  const router = useRouter();
  const token = typeof router.query.token === 'string' ? router.query.token : '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!isPasswordValid(newPassword)) {
      setError('Password does not meet the requirements below');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: { token, newPassword, confirmPassword },
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="Reset password">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold text-gray-900">Reset password</h1>

        {done ? (
          <div className="mt-6 space-y-4">
            <Alert variant="success">Your password has been reset. You can now log in.</Alert>
            <p className="text-center text-sm text-gray-600">
              <Link href="/auth/login" className="font-medium text-primary-700 hover:text-primary-800">
                Go to login
              </Link>
            </p>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-gray-600">Choose a new password for your account.</p>

            {error && (
              <div className="mt-4">
                <Alert variant="error">{error}</Alert>
              </div>
            )}

            <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
                  placeholder="••••••••"
                />
                <PasswordStrengthMeter password={newPassword} />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </Layout>
  );
}
