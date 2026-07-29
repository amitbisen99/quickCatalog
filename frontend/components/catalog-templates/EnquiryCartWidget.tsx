import { useState } from 'react';
import { CartIcon, MinusIcon, PlusIcon, TrashIcon, XIcon } from '@/components/icons';
import { apiFetch, ApiError } from '@/utils/api';
import { currencySymbol } from '@/utils/currency';
import type { useEnquiryCart } from './useEnquiryCart';

interface Props {
  catalogId: string;
  currency?: string;
  cart: ReturnType<typeof useEnquiryCart>;
}

type Step = 'cart' | 'contact' | 'success';

export default function EnquiryCartWidget({ catalogId, currency, cart }: Props) {
  const symbol = currencySymbol(currency);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('cart');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalItems = cart.items.length;

  function openWidget() {
    setStep('cart');
    setError('');
    setOpen(true);
  }

  function closeWidget() {
    setOpen(false);
  }

  async function handleSubmit() {
    setError('');
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!/^\d{7,15}$/.test(mobile.trim())) {
      setError('Please enter a valid mobile number');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch(`/catalogs/${catalogId}/enquiries`, {
        method: 'POST',
        body: {
          customerName: name.trim(),
          customerMobile: mobile.trim(),
          customerEmail: email.trim() || undefined,
          items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        },
      });
      cart.clear();
      setStep('success');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {totalItems > 0 && (
        <button
          onClick={openWidget}
          aria-label="View enquiry cart"
          className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary-700 text-white shadow-lg transition-transform hover:scale-105"
        >
          <CartIcon className="h-6 w-6" />
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-secondary-500 px-1 text-[11px] font-bold text-primary-950">
            {totalItems}
          </span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-gray-900/50" onClick={closeWidget} />
          <div className="relative flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3.5">
              <h2 className="text-base font-semibold text-gray-900">
                {step === 'cart' && 'Your Enquiry'}
                {step === 'contact' && 'Your Details'}
                {step === 'success' && 'Enquiry Sent'}
              </h2>
              <button onClick={closeWidget} aria-label="Close" className="p-1 text-gray-400 hover:bg-gray-100">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {step === 'cart' && (
                <>
                  {cart.items.length === 0 ? (
                    <p className="mt-8 text-center text-sm text-gray-500">Your enquiry list is empty.</p>
                  ) : (
                    <ul className="space-y-3">
                      {cart.items.map((item) => (
                        <li key={item.productId} className="flex items-center gap-3 border border-gray-200 p-2.5">
                          {item.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.image} alt="" className="h-14 w-14 shrink-0 object-cover" />
                          ) : (
                            <div className="h-14 w-14 shrink-0 bg-gray-100" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                            <p className="text-xs text-gray-500">
                              {symbol}{item.price} / {item.unit || 'pcs'}
                              {item.taxPercent ? ` (+${item.taxPercent}% tax)` : ''}
                            </p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <button
                                onClick={() => cart.updateQuantity(item.productId, item.quantity - 1)}
                                className="flex h-6 w-6 items-center justify-center border border-gray-300 text-gray-500 hover:bg-gray-50"
                              >
                                <MinusIcon className="h-3 w-3" />
                              </button>
                              <span className="w-5 text-center text-sm text-gray-900">{item.quantity}</span>
                              <button
                                onClick={() => cart.updateQuantity(item.productId, item.quantity + 1)}
                                className="flex h-6 w-6 items-center justify-center border border-gray-300 text-gray-500 hover:bg-gray-50"
                              >
                                <PlusIcon className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          <button
                            onClick={() => cart.removeItem(item.productId)}
                            aria-label="Remove"
                            className="shrink-0 text-gray-400 hover:text-red-600"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              {step === 'contact' && (
                <div className="space-y-4">
                  {error && <p className="bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                    <input
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/[^\d]/g, ''))}
                      className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email (optional)</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                    />
                  </div>
                </div>
              )}

              {step === 'success' && (
                <div className="mt-8 text-center">
                  <p className="text-sm font-medium text-gray-900">Thanks — your enquiry has been sent!</p>
                  <p className="mt-1 text-sm text-gray-500">The vendor will get back to you soon.</p>
                </div>
              )}
            </div>

            {step === 'cart' && cart.items.length > 0 && (
              <div className="border-t border-gray-200 p-4">
                <button
                  onClick={() => setStep('contact')}
                  className="w-full bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800"
                >
                  Send Enquiry ({totalItems})
                </button>
                <button onClick={() => cart.clear()} className="mt-2 w-full text-center text-xs text-gray-400 hover:text-gray-600">
                  Clear all
                </button>
              </div>
            )}

            {step === 'contact' && (
              <div className="border-t border-gray-200 p-4">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Sending…' : 'Submit Enquiry'}
                </button>
                <button onClick={() => setStep('cart')} className="mt-2 w-full text-center text-xs text-gray-500 hover:text-gray-700">
                  ← Back to cart
                </button>
              </div>
            )}

            {step === 'success' && (
              <div className="border-t border-gray-200 p-4">
                <button
                  onClick={closeWidget}
                  className="w-full bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
