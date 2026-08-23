// Custom entry point for Node.js hosts that need a plain .js file to run
// directly (e.g. Hostinger/cPanel-style hosting, which runs everything
// through Phusion Passenger and has no notion of the `next start` CLI
// command) — Passenger imports this file and expects it to open a server,
// rather than shelling out to a package.json script the way Vercel/Render
// do. Programmatically boots the same Next.js production server that
// `next start` runs under the hood, so behavior is identical either way.
const { createServer } = require('http');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Passenger sets PORT itself and routes the domain/subdomain to it — don't
// hardcode a port here, or the host won't be able to reach the app.
const port = process.env.PORT || 3000;

app
  .prepare()
  .then(() => {
    createServer((req, res) => handle(req, res)).listen(port, (err) => {
      if (err) throw err;
      console.log(`> QuickCatalog frontend ready on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start Next.js:', err);
    process.exit(1);
  });
