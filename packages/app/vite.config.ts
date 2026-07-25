import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

function sheetsProxyPlugin(): Plugin {
  return {
    name: 'sheets-proxy',
    configureServer(server) {
      server.middlewares.use('/sheets-proxy', async (req, res) => {
        const url = new URL(req.url, 'https://docs.google.com');
        if (!url.pathname.startsWith('/spreadsheets/')) {
          res.statusCode = 400;
          res.end('Invalid path');
          return;
        }
        const targetUrl = url.href;
        try {
          // Node's built-in fetch follows redirects, so Google's auth redirects
          // are resolved server-side and never reach the browser as CORS requests.
          const upstream = await fetch(targetUrl);
          res.statusCode = upstream.status;
          const ct = upstream.headers.get('content-type');
          if (ct) {
            res.setHeader('content-type', ct);
          }
          res.end(await upstream.text());
        } catch (err) {
          res.statusCode = 502;
          res.end('Proxy error: ' + String(err));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), sheetsProxyPlugin()],
  // GitHub Pages has no server-side rewrites, so deep links (e.g. /team/summary) are served via
  // a copied `dist/index.html` -> `dist/404.html` fallback (see ci.yml) and the app's own JS
  // router (`shared/pageRouting.ts`) takes it from there. That fallback file's asset URLs must be
  // absolute (leading `/`) so they resolve from the origin regardless of how many path segments
  // deep the requested URL was — a *relative* base (e.g. `./assets/...`) resolves against the
  // current URL's directory instead, which breaks for any path more than one segment below the
  // real site root (e.g. `/team/summary`, confirmed 404ing in production). `VITE_BASE_PATH` is
  // set only by the GitHub Pages CI build (ci.yml); local dev/build/preview default to root `/`.
  base: process.env.VITE_BASE_PATH ?? '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/victory-vendor')) {
            return 'vendor-recharts';
          }
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
        },
      },
    },
  },
});
