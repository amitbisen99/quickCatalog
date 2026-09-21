import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { stripHtml } from './shared';

interface Props {
  html: string;
  className?: string;
}

// A product description is the vendor's rich-text (Quill) output. Sanitizing
// it needs DOMPurify, which needs a real DOM — on Next's server render it has
// no `sanitize` at all, and the public product page is server-rendered, so
// calling it there 500s the whole page for any product with a description.
// So the server (and the first client render, which has to match it for
// hydration) shows the plain-text version; the formatted, sanitized HTML
// replaces it once the browser has mounted. Nothing unsanitized is ever
// emitted as HTML.
export default function RichDescription({ html, className }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className={className}>{stripHtml(html)}</div>;
  return <div className={className} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;
}
