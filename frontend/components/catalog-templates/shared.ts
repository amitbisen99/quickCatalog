// Small helpers shared across every catalog template — keeps the
// per-template components focused on layout/presentation only.

export function whatsappLink(mobileNo: string | undefined, text: string): string {
  if (!mobileNo) return '';
  const digits = mobileNo.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  return initials.toUpperCase();
}

/** Caps text at maxWords words (appending an ellipsis if it was longer) — combined with a `truncate` className, this guarantees the single-line header description never grows past a fixed word budget even before CSS clips it. */
export function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return `${words.slice(0, maxWords).join(' ')}…`;
}
