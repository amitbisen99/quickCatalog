import { API_URL, ApiError } from './api';

// A plain `<a href download>` gives no JS-observable "done" event — the
// browser just handles it natively once headers arrive, so there's nothing
// to hang a loading spinner off of. Fetching the blob ourselves makes the
// download's real duration observable, so a caller can show a spinner for
// exactly as long as it actually takes.
export async function downloadFile(path: string, fallbackFilename: string): Promise<void> {
  const response = await fetch(`${API_URL}${path}`, { credentials: 'include' });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(data.message || 'Could not download the file. Please try again.', response.status);
  }

  const blob = await response.blob();
  const filename = filenameFromContentDisposition(response.headers.get('Content-Disposition')) || fallbackFilename;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/filename="?([^";]+)"?/i);
  return match ? match[1] : null;
}
