const User = require('../models/User');
const Payment = require('../models/Payment');
const toSafeUser = require('../utils/toSafeUser');
const { getPlanPricing, resolveVendorPrice } = require('../utils/planPricing');
const { createOrder, verifyPaymentSignature } = require('../utils/razorpay');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

// What the "Upgrade to Paid" UI shows before the vendor even clicks —
// resolved server-side from their currency so the frontend never has to
// duplicate the India/international pricing logic.
exports.getPlanPrice = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('currency subscriptionType');
  if (!user) {
    throw new AppError('User not found', 404);
  }
  const pricing = await getPlanPricing();
  const { amount, currency } = resolveVendorPrice(user, pricing);
  res.json({ success: true, amount, currency, alreadyPaid: user.subscriptionType === 'paid' });
});

exports.createRazorpayOrder = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  if (user.subscriptionType === 'paid') {
    throw new AppError('You are already on the Paid plan', 400);
  }

  // The amount is always resolved here, server-side, from the vendor's
  // own record and the admin-set price — never accepted from the client,
  // which is the whole point of doing this over Razorpay in the first
  // place rather than just trusting a "I paid" request.
  const pricing = await getPlanPricing();
  const { amount, currency } = resolveVendorPrice(user, pricing);

  const order = await createOrder({
    amount,
    currency,
    // Kept short and opaque (Razorpay's own docs cap receipt at 40 chars) —
    // the full vendor id and intent already live in `notes` below, so the
    // receipt itself only needs to be unique enough to dedupe by.
    receipt: `upg_${user._id}_${Date.now().toString(36)}`,
    notes: { vendorId: String(user._id) },
  });

  // Recorded before the vendor even sees the checkout popup — an
  // abandoned/failed attempt still leaves a row, not just successful ones.
  await Payment.create({
    vendorId: user._id,
    razorpayOrderId: order.id,
    amount: order.amount,
    currency: order.currency,
    status: 'created',
  });

  res.json({
    success: true,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
});

exports.verifyRazorpayPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  const payment = await Payment.findOne({ razorpayOrderId, vendorId: req.user.id });
  if (!payment) {
    throw new AppError('Payment order not found', 404);
  }

  const isValid = verifyPaymentSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });

  payment.razorpayPaymentId = razorpayPaymentId;
  if (!isValid) {
    payment.status = 'failed';
    await payment.save();
    throw new AppError('Payment verification failed', 400);
  }

  payment.status = 'paid';
  payment.razorpaySignature = razorpaySignature;
  await payment.save();

  const user = await User.findById(req.user.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  user.subscriptionType = 'paid';
  await user.save();

  res.json({ success: true, message: 'Payment verified — your plan has been upgraded', user: toSafeUser(user) });
});
