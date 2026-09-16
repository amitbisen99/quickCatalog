const User = require('../models/User');
const Catalog = require('../models/Catalog');
const Product = require('../models/Product');
const EmailTemplate = require('../models/EmailTemplate');
const LifecycleEmailLog = require('../models/LifecycleEmailLog');
const SystemSetting = require('../models/SystemSetting');
const { sendEmail } = require('../services/email.service');
const { getCatalogPublicUrl } = require('./catalogPublicUrl');
const { CLIENT_URL } = require('./clientUrl');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// Every lifecycle-email slot, grouped by which stage of the onboarding
// funnel it belongs to. `offsetMs` is measured from that group's anchor
// timestamp (computed per vendor in resolveStage below). The full state
// machine this implements:
//
//   Signup -> [unverified] -> D1 (1d) -> D2 (3d) -> [verified]
//   verified -> [no catalog] -> A1 (2d) -> A2 (5d) -> A3 (12d) -> [catalog created]
//   catalog created -> [no products] -> B1 (2h) -> B2 (2d) -> B3 (5d) -> [product added]
//   product added -> E1 (2h: how to share)
//                 -> [not upgraded] -> C1 (3d) -> C2 (7d) -> C3 (12d) -> [upgraded: stop]
//
// Upgrading to paid stops every group immediately, at any stage — not
// handled per-slot but by runLifecycleEmailCheck's User query excluding
// paid vendors outright.
const SEQUENCE_DEFS = [
  { slug: 'verify_day1', label: 'D1 — Verify your email (Day 1)', group: 'D', offsetMs: 1 * DAY },
  { slug: 'verify_day3', label: 'D2 — Verify your email (Day 3)', group: 'D', offsetMs: 3 * DAY },

  { slug: 'catalog_day2', label: 'A1 — No catalog yet (Day 2)', group: 'A', offsetMs: 2 * DAY },
  { slug: 'catalog_day5', label: 'A2 — No catalog yet (Day 5)', group: 'A', offsetMs: 5 * DAY },
  { slug: 'catalog_day12', label: 'A3 — No catalog yet (Day 12)', group: 'A', offsetMs: 12 * DAY },

  { slug: 'products_2hr', label: 'B1 — No products yet (2 hours)', group: 'B', offsetMs: 2 * HOUR },
  { slug: 'products_day2', label: 'B2 — No products yet (Day 2)', group: 'B', offsetMs: 2 * DAY },
  { slug: 'products_day5', label: 'B3 — No products yet (Day 5)', group: 'B', offsetMs: 5 * DAY },

  { slug: 'share_catalog_2hr', label: 'E1 — How to share your catalog (2 hours)', group: 'E', offsetMs: 2 * HOUR },

  { slug: 'upgrade_day3', label: 'C1 — Free setup offer (Day 3)', group: 'C', offsetMs: 3 * DAY },
  { slug: 'upgrade_day7', label: 'C2 — Social proof & feature unlock (Day 7)', group: 'C', offsetMs: 7 * DAY },
  { slug: 'upgrade_day12', label: 'C3 — Scarcity / special offer (Day 12)', group: 'C', offsetMs: 12 * DAY },
];

// Runs at server startup so the admin's Email Templates list always shows
// all 12 slots (with empty subject/body) even before anyone's written
// copy — upsert-only, never overwrites content an admin already saved.
async function seedEmailTemplates() {
  for (const def of SEQUENCE_DEFS) {
    await EmailTemplate.updateOne(
      { slug: def.slug },
      { $setOnInsert: { slug: def.slug, label: def.label, group: def.group, subject: '', body: '' } },
      { upsert: true }
    );
  }
}

// The "new signups only" cutoff — the moment this feature first ran in
// this deployment, persisted so it's a real fact rather than a guessed,
// hardcoded date in code. Cached in memory after the first read since it
// never changes once set.
let cachedLaunchDate = null;
async function getLaunchDate() {
  if (cachedLaunchDate) return cachedLaunchDate;
  let setting = await SystemSetting.findOne({ key: 'lifecycleEmailsLaunchedAt' });
  if (!setting) {
    setting = await SystemSetting.create({ key: 'lifecycleEmailsLaunchedAt', value: new Date() });
  }
  cachedLaunchDate = new Date(setting.value);
  return cachedLaunchDate;
}

// {{businessName}}, {{catalogLink}}, {{upgradeLink}}, {{dashboardLink}} —
// the fixed merge-field set admins can drop into subject/body. catalogLink
// resolves empty when the vendor has no catalog yet (the D/A-stage
// templates) rather than erroring — that's a content decision for
// whoever's writing the copy, not something to fail on.
function renderTemplate(str, { vendor, catalog }) {
  const catalogLink = catalog ? getCatalogPublicUrl(catalog.slug, vendor) : '';
  return (str || '')
    .replace(/{{\s*businessName\s*}}/g, vendor.businessName || vendor.email)
    .replace(/{{\s*catalogLink\s*}}/g, catalogLink)
    .replace(/{{\s*upgradeLink\s*}}/g, `${CLIENT_URL || ''}/dashboard/settings`)
    .replace(/{{\s*dashboardLink\s*}}/g, `${CLIENT_URL || ''}/dashboard`);
}

// Which stage a vendor currently sits in, and that stage's anchor
// timestamp — mirrors the flowchart's state machine exactly. Null means
// "not eligible for any lifecycle email right now" (verified before
// verifiedAt existed — see User.js's comment on that field).
function resolveStage(vendor, catalog, firstProductAt) {
  if (vendor.status !== 'verified') {
    return { group: 'D', anchor: vendor.createdAt };
  }
  if (!vendor.verifiedAt) {
    return null;
  }
  if (!catalog) {
    return { group: 'A', anchor: vendor.verifiedAt };
  }
  if (!firstProductAt) {
    return { group: 'B', anchor: catalog.createdAt };
  }
  return { group: 'C_E', anchor: firstProductAt };
}

async function runLifecycleEmailCheck() {
  const launchDate = await getLaunchDate();
  const now = Date.now();

  // Paid vendors excluded outright — the global "stop after upgrade"
  // rule, enforced here rather than as a per-slot check.
  const candidates = await User.find({
    createdAt: { $gte: launchDate },
    subscriptionType: { $ne: 'paid' },
  }).select(
    'email businessName status verifiedAt createdAt subdomain subdomainStatus customDomain customDomainStatus'
  );
  if (candidates.length === 0) return;

  const vendorIds = candidates.map((u) => u._id);

  const catalogDocs = await Catalog.find({ vendorId: { $in: vendorIds } })
    .sort({ createdAt: 1 })
    .select('vendorId slug createdAt');
  const firstCatalogByVendor = new Map();
  for (const c of catalogDocs) {
    const key = String(c.vendorId);
    if (!firstCatalogByVendor.has(key)) firstCatalogByVendor.set(key, c);
  }

  const catalogIds = [...firstCatalogByVendor.values()].map((c) => c._id);
  const productDocs = catalogIds.length
    ? await Product.find({ catalogIds: { $in: catalogIds } })
        .sort({ createdAt: 1 })
        .select('catalogIds createdAt')
    : [];
  const firstProductAtByCatalogId = new Map();
  for (const p of productDocs) {
    for (const cid of p.catalogIds) {
      const key = String(cid);
      if (!firstProductAtByCatalogId.has(key)) firstProductAtByCatalogId.set(key, p.createdAt);
    }
  }

  const [templates, sentLogs] = await Promise.all([
    // Only slots an admin has actually written content for — an empty
    // slot is treated as "not ready", re-checked every run rather than
    // permanently skipped, so it starts sending as soon as content is added.
    EmailTemplate.find({ subject: { $ne: '' }, body: { $ne: '' } }),
    LifecycleEmailLog.find({ vendorId: { $in: vendorIds } }).select('vendorId slug'),
  ]);
  const templateBySlug = new Map(templates.map((t) => [t.slug, t]));
  const sentSet = new Set(sentLogs.map((l) => `${l.vendorId}:${l.slug}`));

  for (const vendor of candidates) {
    const catalog = firstCatalogByVendor.get(String(vendor._id)) || null;
    const firstProductAt = catalog ? firstProductAtByCatalogId.get(String(catalog._id)) : null;
    const stage = resolveStage(vendor, catalog, firstProductAt);
    if (!stage) continue;

    // C and E share the same anchor (first product added), so a vendor
    // in that stage is checked against both groups' slugs at once.
    const groups = stage.group === 'C_E' ? ['C', 'E'] : [stage.group];
    const dueSlugs = SEQUENCE_DEFS.filter(
      (def) => groups.includes(def.group) && now - stage.anchor.getTime() >= def.offsetMs
    );

    for (const def of dueSlugs) {
      if (sentSet.has(`${vendor._id}:${def.slug}`)) continue;
      const template = templateBySlug.get(def.slug);
      if (!template) continue;

      const result = await sendEmail({
        to: vendor.email,
        subject: renderTemplate(template.subject, { vendor, catalog }),
        htmlContent: renderTemplate(template.body, { vendor, catalog }),
      });

      if (result.sent) {
        try {
          await LifecycleEmailLog.create({ vendorId: vendor._id, slug: def.slug });
        } catch (err) {
          // Unique-index race (two overlapping ticks) — the email already
          // went out either way, just don't crash the whole batch over it.
          console.error(`Failed to record lifecycle email log for ${vendor._id}/${def.slug}:`, err.message);
        }
      }
    }
  }
}

// 2-hour-granularity slots (B1, E1) are the tightest window in play, so
// this checks every 30 minutes — frequent enough that neither drifts far
// off its target, without hammering the DB. Same startup-then-interval
// shape as allowedOriginsCache.js's startAllowedOriginsRefresh.
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

function startLifecycleEmails() {
  seedEmailTemplates()
    .then(runLifecycleEmailCheck)
    .catch((err) => console.error('Lifecycle email startup run failed:', err.message));
  setInterval(() => {
    runLifecycleEmailCheck().catch((err) => console.error('Lifecycle email check failed:', err.message));
  }, CHECK_INTERVAL_MS).unref();
}

module.exports = {
  seedEmailTemplates,
  runLifecycleEmailCheck,
  startLifecycleEmails,
  resolveStage,
  renderTemplate,
  SEQUENCE_DEFS,
};
