import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Alert from '@/components/Alert';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';
import MobileNumberInput from '@/components/MobileNumberInput';
import { apiFetch, ApiError } from '@/utils/api';
import { isPasswordValid, isValidEmail } from '@/utils/validators';
import { DEFAULT_COUNTRY_CODE } from '@/utils/countries';

interface FieldErrors {
  [field: string]: string;
}

export default function Signup() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [touched, setTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-fills from the landing page's email-capture forms, which redirect
  // here as /signup?email=... — router.query is {} on the very first
  // client render (a Next.js Pages Router quirk), so this naturally waits
  // for it to resolve rather than needing a router.isReady guard: the
  // effect just re-runs once query.email actually has a value.
  useEffect(() => {
    if (typeof router.query.email === 'string' && router.query.email) {
      setEmail(router.query.email);
    }
  }, [router.query.email]);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!isValidEmail(email)) errors.email = 'Enter a valid email address';
    if (!/^\d{7,15}$/.test(mobileNo)) errors.mobileNo = 'Enter a valid mobile number';
    if (!isPasswordValid(password)) errors.password = 'Password does not meet the requirements below';
    if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match';
    if (!acceptedTerms) errors.acceptedTerms = 'You must accept the terms and conditions';
    return errors;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    setFormError('');

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const result = await apiFetch<{ devOtp?: string }>('/auth/signup', {
        method: 'POST',
        body: { email, mobileNo, countryCode, password, confirmPassword, acceptedTerms },
      });

      sessionStorage.setItem('qc_verify_email', email);
      if (result.devOtp) {
        sessionStorage.setItem('qc_dev_otp', result.devOtp);
      }
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors?.length) {
          const mapped: FieldErrors = {};
          err.errors.forEach((fe) => {
            mapped[fe.field] = fe.message;
          });
          setFieldErrors(mapped);
        }
        setFormError(err.message);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="Sign up">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
        <p className="mt-1 text-sm text-gray-600">Start building your catalog in minutes.</p>

        {formError && (
          <div className="mt-4">
            <Alert variant="error">{formError}</Alert>
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
            {touched && fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
          </div>

          <MobileNumberInput
            countryCode={countryCode}
            mobileNo={mobileNo}
            onCountryCodeChange={setCountryCode}
            onMobileNoChange={setMobileNo}
            error={touched ? fieldErrors.mobileNo : undefined}
          />

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
              placeholder="••••••••"
            />
            <PasswordStrengthMeter password={password} />
            {touched && fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
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
            {touched && fieldErrors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <div>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-700 focus:ring-primary-700"
              />
              I agree to the Terms &amp; Conditions and Privacy Policy
            </label>
            {touched && fieldErrors.acceptedTerms && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.acceptedTerms}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary-700 hover:text-primary-800">
            Log in
          </Link>
        </p>
      </div>
    </Layout>
  );
}
