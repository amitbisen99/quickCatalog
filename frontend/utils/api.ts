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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010';
  const base = API_URL.startsWith('http') ? API_URL : `${appUrl}${API_URL}`;
  return `${base}${path}`;
}

export class ApiError extends Error {
  status: number;
  errors?: { field: string; message: string }[];

  constructor(message: string, status: number, errors?: { field: string; message: string }[]) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
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
      throw new ApiError(retry.data.message || 'Something went wrong', retry.response.status, retry.data.errors);
    }
  }

  if (!response.ok) {
    throw new ApiError(data.message || 'Something went wrong', response.status, data.errors);
  }

  return data as T;
}
