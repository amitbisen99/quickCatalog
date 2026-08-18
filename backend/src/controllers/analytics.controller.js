const mongoose = require('mongoose');
const Catalog = require('../models/Catalog');
const Product = require('../models/Product');
const Enquiry = require('../models/Enquiry');
const Visit = require('../models/Visit');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const detectDevice = require('../utils/detectDevice');

const TREND_DAYS = 30;

// Fire-and-forget beacon from an anonymous visitor on a public catalog
// page. Always resolves 200 with no detail — a malformed/blocked/replayed
// beacon should never surface an error to a site visitor, it should just
// be silently dropped.
exports.trackVisit = asyncHandler(async (req, res) => {
  const { catalogSlug, visitorId, productId } = req.body || {};

  if (typeof catalogSlug !== 'string' || !catalogSlug.trim() || typeof visitorId !== 'string' || !visitorId.trim()) {
    return res.json({ success: true });
  }

  const catalog = await Catalog.findOne({ slug: catalogSlug.trim().toLowerCase() }).select('_id vendorId');
  if (!catalog) {
    return res.json({ success: true });
  }

  // Never trust productId beyond "is it a well-formed id" — a visit
  // referencing a product that doesn't exist (or doesn't belong to this
  // catalog) is simply excluded later when analytics joins against the
  // catalog's current product list, the same "don't trust the client,
  // just don't let it corrupt anything" approach the enquiry flow uses.
  const resolvedProductId =
    typeof productId === 'string' && mongoose.Types.ObjectId.isValid(productId) ? productId : null;

  await Visit.create({
    vendorId: catalog.vendorId,
    catalogId: catalog._id,
    productId: resolvedProductId,
    visitorId: visitorId.trim().slice(0, 100),
    device: detectDevice(req.headers['user-agent']),
  });

  res.json({ success: true });
});

exports.getCatalogAnalytics = asyncHandler(async (req, res) => {
  const { catalogId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(catalogId)) {
    throw new AppError('Catalog not found', 404);
  }
  const catalog = await Catalog.findOne({ _id: catalogId, vendorId: req.user.id });
  if (!catalog) {
    throw new AppError('Catalog not found', 404);
  }

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (TREND_DAYS - 1));
  since.setUTCHours(0, 0, 0, 0);

  const [
    totalViews,
    uniqueVisitorIds,
    deviceAgg,
    trendAgg,
    productViewAgg,
    totalEnquiries,
    funnelAgg,
    productEnquiryAgg,
    products,
  ] = await Promise.all([
    Visit.countDocuments({ catalogId: catalog._id, productId: null }),
    Visit.distinct('visitorId', { catalogId: catalog._id }),
    Visit.aggregate([
      { $match: { catalogId: catalog._id } },
      { $group: { _id: '$device', count: { $sum: 1 } } },
    ]),
    Visit.aggregate([
      { $match: { catalogId: catalog._id, productId: null, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    ]),
    Visit.aggregate([
      { $match: { catalogId: catalog._id, productId: { $ne: null } } },
      { $group: { _id: '$productId', views: { $sum: 1 } } },
    ]),
    Enquiry.countDocuments({ catalogId: catalog._id }),
    Enquiry.aggregate([
      { $match: { catalogId: catalog._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Enquiry.aggregate([
      { $match: { catalogId: catalog._id } },
      { $unwind: '$items' },
      { $group: { _id: '$items.productId', count: { $sum: 1 } } },
    ]),
    Product.find({ catalogIds: catalog._id }).select('name').lean(),
  ]);

  const deviceBreakdown = { mobile: 0, desktop: 0 };
  deviceAgg.forEach((row) => {
    if (row._id === 'mobile' || row._id === 'desktop') deviceBreakdown[row._id] = row.count;
  });

  // Zero-fill every day in the window — the frontend chart shouldn't
  // have to special-case missing days, and a catalog with zero traffic
  // on a given day is itself a meaningful (flat) data point.
  const trendMap = new Map(trendAgg.map((row) => [row._id, row.count]));
  const viewsTrend = [];
  for (let i = 0; i < TREND_DAYS; i += 1) {
    const d = new Date(since);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    viewsTrend.push({ date: key, views: trendMap.get(key) || 0 });
  }

  const enquiryFunnel = { new: 0, contacted: 0, closed: 0 };
  funnelAgg.forEach((row) => {
    if (row._id in enquiryFunnel) enquiryFunnel[row._id] = row.count;
  });

  // Per-product stats, joined against the catalog's CURRENT product list
  // — a visit/enquiry referencing a product since removed from this
  // catalog (or deleted) is excluded rather than shown as a dangling id.
  const nameById = new Map(products.map((p) => [String(p._id), p.name]));
  const viewsById = new Map(productViewAgg.map((r) => [String(r._id), r.views]));
  const enquiriesById = new Map(productEnquiryAgg.map((r) => [String(r._id), r.count]));

  // Same "rank this per-product count map, drop ids that no longer
  // resolve to a real product, take the top 10" shape for both views
  // and enquiries — only the count's field name differs.
  function topProducts(countById, valueKey) {
    return [...countById.entries()]
      .filter(([id]) => nameById.has(id))
      .map(([id, value]) => ({ productId: id, name: nameById.get(id), [valueKey]: value }))
      .sort((a, b) => b[valueKey] - a[valueKey])
      .slice(0, 10);
  }

  const topProductsByViews = topProducts(viewsById, 'views');
  const topProductsByEnquiries = topProducts(enquiriesById, 'count');

  // Worst-engaged products (lowest views + enquiry mentions combined),
  // capped to 10 — an actionable callout, not just a vanity metric.
  const underperformingProducts = products
    .map((p) => {
      const id = String(p._id);
      return {
        productId: id,
        name: p.name,
        views: viewsById.get(id) || 0,
        enquiries: enquiriesById.get(id) || 0,
      };
    })
    .sort((a, b) => a.views + a.enquiries - (b.views + b.enquiries))
    .slice(0, 10);

  // Standard e-commerce-style conversion rate: enquiries per catalog
  // view, not per unique visitor — a repeat visitor who finally enquires
  // should count the same as a first-time one converting immediately.
  const conversionRate = totalViews > 0 ? Math.round((totalEnquiries / totalViews) * 1000) / 10 : 0;

  res.json({
    success: true,
    analytics: {
      totalViews,
      uniqueVisitors: uniqueVisitorIds.length,
      totalEnquiries,
      conversionRate,
      deviceBreakdown,
      viewsTrend,
      enquiryFunnel,
      topProductsByViews,
      topProductsByEnquiries,
      underperformingProducts,
    },
  });
});
