const mongoose = require('mongoose');
const Enquiry = require('../models/Enquiry');
const Catalog = require('../models/Catalog');
const Product = require('../models/Product');
const User = require('../models/User');
const { sendEnquiryNotificationEmail } = require('../services/email.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

function toEnquiryResponse(enquiry) {
  return {
    id: enquiry._id,
    catalogId: enquiry.catalogId,
    catalogName: enquiry.catalogName,
    customerName: enquiry.customerName,
    customerMobile: enquiry.customerMobile,
    customerEmail: enquiry.customerEmail,
    items: enquiry.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      unit: item.unit,
      taxPercent: item.taxPercent,
      quantity: item.quantity,
    })),
    status: enquiry.status,
    createdAt: enquiry.createdAt,
  };
}

// No auth — submitted by an anonymous visitor from the public catalog
// page's enquiry cart.
exports.createEnquiryForCatalog = asyncHandler(async (req, res) => {
  const { catalogId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(catalogId)) {
    throw new AppError('Catalog not found', 404);
  }
  const catalog = await Catalog.findById(catalogId);
  if (!catalog) {
    throw new AppError('Catalog not found', 404);
  }

  const { customerName, customerMobile, customerEmail, items } = req.body;

  // Never trust client-submitted price/name — re-derive from the live
  // product, scoped to this catalog so an enquiry can't be forged for
  // products that aren't actually in it.
  const productIds = items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds }, catalogIds: catalog._id });
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const snapshotItems = items
    .map((i) => {
      const product = productMap.get(i.productId);
      if (!product) return null;
      return {
        productId: product._id,
        name: product.name,
        price: product.price,
        unit: product.unit,
        taxPercent: product.taxPercent,
        quantity: Math.max(1, parseInt(i.quantity, 10) || 1),
      };
    })
    .filter(Boolean);

  if (snapshotItems.length === 0) {
    throw new AppError('The selected products are no longer available in this catalog', 400);
  }

  const enquiry = await Enquiry.create({
    vendorId: catalog.vendorId,
    catalogId: catalog._id,
    catalogName: catalog.name,
    customerName,
    customerMobile,
    customerEmail: customerEmail || undefined,
    items: snapshotItems,
  });

  // Best-effort — a slow/failed email shouldn't fail the customer's
  // enquiry submission (it's already saved and visible in the dashboard).
  User.findById(catalog.vendorId)
    .then((vendor) => vendor && sendEnquiryNotificationEmail(vendor.email, enquiry))
    .catch((err) => console.error('Enquiry notification email failed:', err.message));

  res.status(201).json({ success: true, message: 'Enquiry sent successfully', enquiry: toEnquiryResponse(enquiry) });
});

exports.getEnquiries = asyncHandler(async (req, res) => {
  const enquiries = await Enquiry.find({ vendorId: req.user.id }).sort({ createdAt: -1 });
  res.json({ success: true, enquiries: enquiries.map(toEnquiryResponse) });
});

exports.getEnquiryById = asyncHandler(async (req, res) => {
  const { enquiryId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(enquiryId)) {
    throw new AppError('Enquiry not found', 404);
  }
  const enquiry = await Enquiry.findOne({ _id: enquiryId, vendorId: req.user.id });
  if (!enquiry) {
    throw new AppError('Enquiry not found', 404);
  }
  res.json({ success: true, enquiry: toEnquiryResponse(enquiry) });
});

exports.updateEnquiryStatus = asyncHandler(async (req, res) => {
  const { enquiryId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(enquiryId)) {
    throw new AppError('Enquiry not found', 404);
  }
  const enquiry = await Enquiry.findOne({ _id: enquiryId, vendorId: req.user.id });
  if (!enquiry) {
    throw new AppError('Enquiry not found', 404);
  }

  enquiry.status = req.body.status;
  await enquiry.save();

  res.json({ success: true, message: 'Status updated', enquiry: toEnquiryResponse(enquiry) });
});
