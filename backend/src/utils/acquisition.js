// Registration-source tracking. The frontend (utils/attribution.ts) saves the
// UTM tags / referrer of a visitor's first tagged landing and sends them along
// with the signup request; this turns that raw, untrusted payload into what
// gets stored on the User. docs/utm-guide.md is the human-facing spec of the
// tags these rules recognise — keep the two in step.

const ACQUISITION_CHANNELS = ['email', 'meta_ads', 'catalog_footer', 'direct', 'other'];

// Used by the admin Excel export; the admin UI has its own copy
// (frontend/utils/attribution.ts) since it also needs the filter options.
const CHANNEL_LABELS = {
  email: 'Email',
  meta_ads: 'Meta Ads',
  catalog_footer: 'Catalog Footer',
  direct: 'Direct',
  other: 'Other',
};

const MAX_TAG_LENGTH = 100;
const MAX_URL_LENGTH = 300;

// Every value ends up in the admin UI and the Excel export, so it's bounded
// here. UTM tags are lowercased so "Meta" / "meta" / "META" can't become three
// separate rows in a report; URLs keep their case.
function cleanTag(value) {
  return typeof value === 'string' ? value.trim().toLowerCase().slice(0, MAX_TAG_LENGTH) : '';
}

function cleanUrl(value) {
  return typeof value === 'string' ? value.trim().slice(0, MAX_URL_LENGTH) : '';
}

const META_SOURCES = new Set(['meta', 'facebook', 'instagram', 'fb', 'ig']);

function classifyChannel({ source, medium, campaign, content, referrer }) {
  if (medium === 'email' || source === 'smartlead') return 'email';
  if (META_SOURCES.has(source)) return 'meta_ads';
  if (source === 'catalog') return 'catalog_footer';
  // Tagged, but with a source this list doesn't know about — surface it as
  // "other" rather than pretending it's direct.
  if (source || medium || campaign || content) return 'other';
  // Untagged: no referrer means typed/bookmarked/pasted-in-a-chat, a referrer
  // means they came from some site we didn't tag.
  return referrer ? 'other' : 'direct';
}

/**
 * Builds the `acquisition` block for a new user. Never throws and never
 * rejects: tracking data is best-effort, so a missing, malformed or hostile
 * payload just degrades to `channel: 'direct'` instead of blocking a signup.
 */
function buildAcquisition(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};

  const acquisition = {
    source: cleanTag(input.source),
    medium: cleanTag(input.medium),
    campaign: cleanTag(input.campaign),
    content: cleanTag(input.content),
    referrer: cleanUrl(input.referrer),
    landingPage: cleanUrl(input.landingPage),
  };
  acquisition.channel = classifyChannel(acquisition);

  // When the visitor first landed (ms since epoch, from their browser) —
  // ignored if it isn't a sane past timestamp.
  const capturedAt = Number(input.capturedAt);
  if (Number.isFinite(capturedAt) && capturedAt > 0 && capturedAt <= Date.now()) {
    acquisition.capturedAt = new Date(capturedAt);
  }

  // Drop the empty strings so stored documents only carry what was present.
  return Object.fromEntries(Object.entries(acquisition).filter(([, value]) => value !== ''));
}

module.exports = { ACQUISITION_CHANNELS, CHANNEL_LABELS, buildAcquisition, classifyChannel };
