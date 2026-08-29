import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
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
        {/* Icons for the marketing homepage (pages/index.tsx) — CSS-only kit,
            no JS-based SVG replacement, so it doesn't fight React's DOM. */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
