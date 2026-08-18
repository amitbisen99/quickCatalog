import { FormEvent, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import Alert from '@/components/Alert';
import { apiFetch, ApiError } from '@/utils/api';

const REASON_MAX = 500;

type ContactMethod = 'email' | 'mobile';

function SupportPage() {
  const [reason, setReason] = useState('');
  const [contactPersonName, setContactPersonName] = useState('');
  const [contactMethod, setContactMethod] = useState<ContactMethod>('email');
  const [contactValue, setContactValue] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function resetForm() {
    setReason('');
    setContactPersonName('');
    setContactMethod('email');
    setContactValue('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const res = await apiFetch<{ message: string }>('/support-tickets', {
        method: 'POST',
        body: { reason, contactPersonName, contactMethod, contactValue },
      });
      setSuccess(res.message);
      resetForm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send your message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout title="Support">
      <h1 className="text-3xl font-bold text-gray-900">Support</h1>
      <p className="mt-1 text-sm text-gray-500">Have a question or an issue? Send us a message and we&apos;ll get back to you.</p>

      <div className="mt-6 max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {success && (
          <div className="mb-4">
            <Alert variant="success">{success}</Alert>
          </div>
        )}
        {error && (
          <div className="mb-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">Reason for contact</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX))}
              required
              rows={5}
              maxLength={REASON_MAX}
              placeholder="Tell us what you need help with…"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
            <p className="mt-1 text-right text-xs text-gray-400">
              {reason.length}/{REASON_MAX}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Person to contact</label>
            <input
              value={contactPersonName}
              onChange={(e) => setContactPersonName(e.target.value)}
              required
              placeholder="Your name"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">How we can contact you?</label>
            <div className="mt-2 flex gap-4">
              {(['email', 'mobile'] as ContactMethod[]).map((method) => (
                <label key={method} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="contactMethod"
                    value={method}
                    checked={contactMethod === method}
                    onChange={() => {
                      setContactMethod(method);
                      setContactValue('');
                    }}
                    className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-600"
                  />
                  {method === 'email' ? 'Email' : 'Mobile'}
                </label>
              ))}
            </div>
            <input
              type={contactMethod === 'email' ? 'email' : 'tel'}
              value={contactValue}
              onChange={(e) => setContactValue(e.target.value)}
              required
              placeholder={contactMethod === 'email' ? 'you@business.com' : 'Your mobile number'}
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Sending…' : 'Submit'}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}

export default withAuth(SupportPage);
