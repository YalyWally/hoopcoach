// Wraps the whole Express app (backend/src/app.js) as a single Netlify
// serverless function. netlify.toml redirects /api/* to this function, and
// Netlify hands the function the rewritten request path
// (/.netlify/functions/hoopcoach-api/...) — basePath below strips that
// prefix back off so the Express app sees the same paths it expects locally
// (e.g. /players/:id), matching how server.js mounts it at /api for local dev.
//
// This file lives under backend/netlify/functions (not a top-level
// netlify/functions) specifically so it shares backend/node_modules via
// Node's normal directory-based module resolution — no separate
// package.json/node_modules to keep in sync, and no ambiguity for Netlify's
// bundler about where to find native-binary packages like @libsql/client.
//
// Renamed from `api` to `hoopcoach-api` to force Netlify to build and deploy
// this as a brand-new function with no cached build history — a previous
// deploy of `api` kept serving stale code even after several source fixes
// that a from-scratch rebuild locally confirmed were correct.
import serverless from 'serverless-http';
import app from '../../src/app.js';

export const handler = serverless(app, { basePath: '/.netlify/functions/hoopcoach-api' });
