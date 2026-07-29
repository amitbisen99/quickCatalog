/** Lowercase, hyphenated, URL-safe slug base (uniqueness is checked by the caller). */
module.exports = function slugify(text) {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'catalog';
};
