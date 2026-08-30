import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Deliberately NOT here — a viewport tag placed in _document.tsx
            (the Document-phase Head, not next/head) doesn't dedupe against
            Next's own auto-injected default "width=device-width" viewport
            tag, so both end up in the HTML and the browser uses whichever
            renders first (Next's default, without initial-scale). Set on
            every page instead, via Seo.tsx's next/head <Head>, which Next
            does correctly recognize as an override. */}
        <link rel="manifest" href="/manifest.json" />
        {/* ?v=2 cache-busts the icon itself — browsers cache favicons far
            more aggressively than normal assets and often ignore standard
            cache headers entirely, so a same-URL content swap alone can
            silently keep showing the old icon. Bump this whenever the
            underlying icon file's content changes again. */}
        <link rel="icon" href="/icons/icon.svg?v=2" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png?v=2" />
        <meta name="theme-color" content="#232153" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Instant Catalog" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
