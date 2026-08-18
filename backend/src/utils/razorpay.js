const crypto = require('crypto');
const Razorpay = require('razorpay');

let client;

// Lazily constructed so a missing key at import time (e.g. a route file
// being required before .env is loaded, or in a test context) doesn't
// crash the whole app — the error only surfaces when a payment is
// actually attempted.
function getRazorpayClient() {
  if (!client) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay is not configured — RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET missing');
    }
    client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return client;
}

// Razorpay takes amounts in the smallest currency unit (paise for INR,
// cents for USD) — both of the currencies this app charges in happen to
// use a 100x minor unit, so a single helper covers both.
function toSmallestUnit(amountInMajorUnits) {
  return Math.round(amountInMajorUnits * 100);
}

function createOrder({ amount, currency, receipt, notes }) {
  return getRazorpayClient().orders.create({
    amount: toSmallestUnit(amount),
    currency,
    receipt,
    notes,
  });
}

// Confirms a checkout response actually came from Razorpay and wasn't
// forged client-side — the one thing that must happen before ever
// trusting "the payment succeeded". Per Razorpay's documented scheme:
// HMAC-SHA256 of "order_id|payment_id", signed with the key secret.
function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  // Constant-time compare — a plain === here would leak timing
  // information about how many leading bytes of the signature matched.
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(String(signature || ''), 'hex');
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

module.exports = { getRazorpayClient, createOrder, verifyPaymentSignature, toSmallestUnit };
