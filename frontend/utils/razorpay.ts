export interface RazorpaySuccessResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayCheckout {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayCheckout;
  }
}

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
let scriptPromise: Promise<void> | null = null;

// Loaded on demand rather than globally in _app.tsx — most vendors are
// already Paid or never open the upgrade modal, so there's no reason to
// fetch Razorpay's script on every page load for everyone.
function loadRazorpayScript(): Promise<void> {
  if (typeof window !== 'undefined' && window.Razorpay) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null; // allow retrying on a later attempt instead of caching the failure forever
        reject(new Error('Could not load the payment form. Check your connection and try again.'));
      };
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

export async function openRazorpayCheckout(options: RazorpayOptions): Promise<void> {
  await loadRazorpayScript();
  if (!window.Razorpay) throw new Error('Could not load the payment form. Check your connection and try again.');
  new window.Razorpay(options).open();
}
