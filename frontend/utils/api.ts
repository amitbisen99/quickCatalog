const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
