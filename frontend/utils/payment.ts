export type PaymentStatus = 'created' | 'paid' | 'failed';

// Shared between the admin payments list and detail pages so the two
// never drift on styling/labels for the same status value. Matches
// backend/src/models/Payment.js's status enum exactly — these are the
// only statuses this integration can produce (client-driven checkout +
// signature verification, not Razorpay webhooks).
export const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  created: 'bg-amber-50 text-amber-700',
  paid: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-700',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  created: 'Created (Unpaid)',
  paid: 'Paid',
  failed: 'Failed',
};

// Payment.amount is stored in the smallest currency unit (paise/cents —
// what Razorpay itself deals in), so display always divides by 100.
export function formatPaymentAmount(amount: number): string {
  return (amount / 100).toFixed(2);
}
