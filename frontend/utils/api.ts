// In production, default to a same-origin relative path rather than an
// absolute one — the root vercel.json rewrites /api/* through to the
// Render backend on the frontend's own domain, which keeps auth cookies
// first-party. An absolute cross-origin fallback here would make every
// cookie third-party, and iOS Safari (especially inside an installed
// PWA, which gets no exceptions at all) blocks those outright — the
// vendor would look logged out every time they reopen the app. Explicit
// env var still wins if one is set.
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

// API_URL is deliberately relative ("/api") in production so browser
// fetches stay same-origin — fine for the app's own requests, but a few
// places (Open Graph tags, share links) need a fully-qualified URL a
// server or crawler can hit directly with no "relative to what?"
// ambiguity. Resolves against NEXT_PUBLIC_APP_URL when API_URL isn't
// already absolute.
export function absoluteApiUrl(path: string): string {
  // Trailing slash stripped — a NEXT_PUBLIC_APP_URL set with one would
  // otherwise double up wherever this concatenates against API_URL/path,
  // both of which start with their own leading slash.
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010').replace(/\/+$/, '');
  const base = API_URL.startsWith('http') ? API_URL : `${appUrl}${API_URL}`;
  return `${base}${path}`;
}

// Shared secret for calls made by THIS Next.js server itself, on its own
// behalf, to the backend — public catalog pages' getServerSideProps,
// middleware's domain lookup, the sitemap. Deliberately NOT a NEXT_PUBLIC_
// var: it must never ship to the browser. The backend uses it to exempt
// this app's own server-to-server traffic from its per-visitor rate limit
// (see backend/src/utils/internalRequest.js) — every public catalog view
// is otherwise one more hit against a single bucket keyed to this server's
// own IP, shared by every visitor of every vendor's catalog, which is
// exactly the thing that gets worse as more vendors (and their visitors)
// join. Unset in an environment with no INTERNAL_API_SECRET configured —
// those requests just fall back to the ordinary per-IP limit.
function internalRequestHeaders(): HeadersInit {
  return process.env.INTERNAL_API_SECRET ? { 'x-internal-secret': process.env.INTERNAL_API_SECRET } : {};
}

/**
 * fetch() for this server calling its own backend directly on no one's
 * behalf in particular — never use this for a request being made for a
 * specific vendor/visitor from the browser (that's apiFetch, which must
 * NOT carry this secret).
 */
export function internalFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...init, headers: { ...init?.headers, ...internalRequestHeaders() } });
}

export class ApiError extends Error {
  status: number;
  errors?: { field: string; message: string }[];
  retryAfterSeconds?: number;

  constructor(message: string, status: number, errors?: { field: string; message: string }[], retryAfterSeconds?: number) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Formats a caught error for display — an ApiError's own message (with how
 * long to wait appended, for a 429) if it is one, the given fallback
 * otherwise. Small helper so every page's `catch` block doesn't repeat the
 * same `err instanceof ApiError ? err.message : '...'` check.
 */
export function errorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback;
  if (err.retryAfterSeconds) {
    const wait = err.retryAfterSeconds >= 60 ? `${Math.ceil(err.retryAfterSeconds / 60)} min` : `${err.retryAfterSeconds}s`;
    return `${err.message} Try again in ${wait}.`;
  }
  return err.message;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  formData?: FormData;
}

// Endpoints where a 401 means "these credentials/tokens are bad" rather
// than "the access token expired" — retrying via refresh would be
// nonsensical or risk a loop.
const NO_REFRESH_RETRY_PATHS = ['/auth/login', '/auth/signup', '/auth/refresh', '/auth/logout'];

async function rawFetch(path: string, options: RequestOptions) {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method || 'GET',
    // FormData sets its own multipart Content-Type (with boundary) —
    // leaving the header unset lets the browser fill it in correctly.
    headers: options.formData || options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: options.formData || (options.body !== undefined ? JSON.stringify(options.body) : undefined),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

// Concurrent 401s share a single in-flight refresh instead of each
// firing their own.
let refreshPromise: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = rawFetch('/auth/refresh', { method: 'POST' })
      .then(({ response }) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiFetch<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { response, data } = await rawFetch(path, options);

  if (response.status === 401 && !NO_REFRESH_RETRY_PATHS.includes(path)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      const retry = await rawFetch(path, options);
      if (retry.response.ok) return retry.data as T;
      throw new ApiError(
        retry.data.message || 'Something went wrong',
        retry.response.status,
        retry.data.errors,
        retry.data.retryAfterSeconds
      );
    }
  }

  if (!response.ok) {
    throw new ApiError(data.message || 'Something went wrong', response.status, data.errors, data.retryAfterSeconds);
  }

  return data as T;
}
