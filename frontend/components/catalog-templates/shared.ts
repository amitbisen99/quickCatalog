// Small helpers shared across every catalog template — keeps the
// per-template components focused on layout/presentation only.

export function whatsappLink(countryCode: string | undefined, mobileNo: string | undefined, text: string): string {
  if (!mobileNo) return '';
  // countryCode is stored separately from mobileNo (see the User model)
  // so a vendor can change their country without reformatting their
  // number — wa.me just wants the two concatenated with no punctuation.
  const digits = `${countryCode || ''}${mobileNo}`.replace(/\D/g, '');
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

const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
  nbsp: ' ',
};

/**
 * Strips HTML tags for a plain-text preview (e.g. a rich-text product
 * description shown as a plain line-clamped snippet). Pure string
 * manipulation — deliberately NOT DOMPurify, which needs a real DOM/
 * `window` and throws when it runs during Next's server-side rendering.
 * Templates rendered from `getServerSideProps` (the public catalog page)
 * execute on the Node server with no DOM, so calling DOMPurify there
 * crashes the request with a 500. Safe here because the result is only
 * ever inserted as a React text node (auto-escaped), never via
 * `dangerouslySetInnerHTML` — it needs to strip tags, not sanitize HTML
 * for re-embedding.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
      if (entity[0] === '#') {
        const isHex = entity[1] === 'x' || entity[1] === 'X';
        const code = parseInt(isHex ? entity.slice(2) : entity.slice(1), isHex ? 16 : 10);
        return Number.isNaN(code) ? match : String.fromCodePoint(code);
      }
      return HTML_ENTITIES[entity] ?? match;
    })
    .replace(/\s+/g, ' ')
    .trim();
}
