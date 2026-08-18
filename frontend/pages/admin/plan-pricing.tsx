import { FormEvent, useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import withAdminAuth from '@/components/withAdminAuth';
import Alert from '@/components/Alert';
import { apiFetch, ApiError } from '@/utils/api';

interface Pricing {
  indiaPriceInr: number;
  internationalPriceUsd: number;
}

function PlanPricingPage() {
  const [indiaPrice, setIndiaPrice] = useState('');
  const [internationalPrice, setInternationalPrice] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ pricing: Pricing }>('/admin/plan-pricing')
      .then((res) => {
        setIndiaPrice(String(res.pricing.indiaPriceInr));
        setInternationalPrice(String(res.pricing.internationalPriceUsd));
        setLoaded(true);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load plan pricing.'));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const res = await apiFetch<{ pricing: Pricing; message: string }>('/admin/plan-pricing', {
        method: 'PUT',
        body: { indiaPriceInr: Number(indiaPrice), internationalPriceUsd: Number(internationalPrice) },
      });
      setIndiaPrice(String(res.pricing.indiaPriceInr));
      setInternationalPrice(String(res.pricing.internationalPriceUsd));
      setSuccess(res.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save plan pricing.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout title="Plan Pricing">
      <h1 className="text-3xl font-bold text-gray-900">Plan Pricing</h1>
      <p className="mt-1 text-sm text-gray-500">
        What vendors pay to upgrade from Free to Paid. A vendor is charged the India price if their account
        currency is INR, and the international price otherwise.
      </p>

      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      {success && (
        <div className="mt-4">
          <Alert variant="success">{success}</Alert>
        </div>
      )}

      {loaded && (
        <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700">India price</label>
            <div className="mt-1 flex rounded-lg border border-gray-300 focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600">
              <span className="flex items-center px-3 text-sm text-gray-500">₹</span>
              <input
                type="number"
                min="0"
                step="1"
                value={indiaPrice}
                onChange={(e) => setIndiaPrice(e.target.value)}
                className="w-full rounded-r-lg px-2 py-2 text-sm focus:outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">Charged to vendors whose account currency is INR.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">International price</label>
            <div className="mt-1 flex rounded-lg border border-gray-300 focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600">
              <span className="flex items-center px-3 text-sm text-gray-500">$</span>
              <input
                type="number"
                min="0"
                step="1"
                value={internationalPrice}
                onChange={(e) => setInternationalPrice(e.target.value)}
                className="w-full rounded-r-lg px-2 py-2 text-sm focus:outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">Charged to vendors whose account currency is anything else.</p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}
    </AdminLayout>
  );
}

export default withAdminAuth(PlanPricingPage);
