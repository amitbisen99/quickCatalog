// Registration-source tracking (client side). On every full page load
// captureAttribution() saves the visitor's UTM tags + referrer to
// localStorage; signup.tsx reads them back with getAttribution() and sends
// them with POST /auth/signup, where the backend classifies and stores them
// (backend/src/utils/acquisition.js). docs/utm-guide.md is the spec for the
// tags that get used.
//
// First-touch: once a UTM-tagged landing has been saved it's never
// overwritten. An untagged first visit doesn't block that, though — someone
// who first lands with no tags and later clicks a tagged link should be
// credited to that link, not to "direct".

const STORAGE_KEY = 'qc_attribution';
const TTL_MS = 90 * 24 * 60 * 60 * 1000;

export interface Attribution {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  referrer?: string;
  landingPage?: string;
  capturedAt: number;
}

function isTagged(a: Attribution): boolean {
  return Boolean(a.source || a.medium || a.campaign || a.content);
}

export function getAttribution(): Attribution | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Attribution;
    if (typeof stored?.capturedAt !== 'number' || Date.now() - stored.capturedAt > TTL_MS) return null;
    return stored;
  } catch {
    // Storage blocked (private mode, cookies disabled) or corrupt JSON —
    // attribution is best-effort, so just behave as if nothing was saved.
    return null;
  }
}

function currentTouch(): Attribution {
  const params = new URLSearchParams(window.location.search);
  const touch: Attribution = {
    source: params.get('utm_source') || undefined,
    medium: params.get('utm_medium') || undefined,
    campaign: params.get('utm_campaign') || undefined,
    content: params.get('utm_content') || undefined,
    // Path only, never the query string — /signup?email=... would otherwise
    // put a visitor's email address into the saved record.
    landingPage: window.location.pathname,
    capturedAt: Date.now(),
  };

  if (document.referrer) {
    try {
      const ref = new URL(document.referrer);
      touch.referrer = ref.origin + ref.pathname;
    } catch {
      // Unparseable referrer — leave it out.
    }
  }
  return touch;
}

export function captureAttribution(): void {
  try {
    const stored = getAttribution();
    if (stored && isTagged(stored)) return;

    const touch = currentTouch();
    if (stored && !isTagged(touch)) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(touch));
  } catch {
    // See getAttribution — never let tracking break a page.
  }
}

// The link a public catalog's footer points at. Absolute on purpose: a
// relative "/" on a vendor's white-label domain is redirected by
// middleware.ts to that vendor's own catalog, so the visitor would never
// reach the marketing site (and the tags would never be seen).
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010').replace(/\/+$/, '');

export function catalogFooterUrl(isPaidVendor: boolean): string {
  const campaign = isPaidVendor ? 'powered_by' : 'free_cta';
  return `${APP_URL}/?utm_source=catalog&utm_medium=footer&utm_campaign=${campaign}`;
}

// Mirrors CHANNEL_LABELS in backend/src/utils/acquisition.js. 'unknown' is
// admin-side only: accounts created before tracking existed have no channel.
export const CHANNEL_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'meta_ads', label: 'Meta Ads' },
  { value: 'catalog_footer', label: 'Catalog Footer' },
  { value: 'direct', label: 'Direct' },
  { value: 'other', label: 'Other' },
  { value: 'unknown', label: 'Unknown (before tracking)' },
];

export function channelLabel(channel?: string): string {
  return CHANNEL_OPTIONS.find((o) => o.value === (channel || 'unknown'))?.label ?? channel ?? 'Unknown';
}
