// Database access layer.
//
// Historically this used better-sqlite3 (a synchronous, file-based SQLite driver).
// To make the backend deployable as Netlify serverless functions — which have no
// persistent local filesystem between invocations — this now talks to a libSQL
// database (Turso in production; a local SQLite file in dev/tests) over
// @libsql/client, which is async.
//
// Rather than rewrite every call site's shape, this exports a small shim that
// keeps the familiar `db.prepare(sql).get/all/run(...params)` call pattern from
// better-sqlite3, just async now — so callers only need to add `await`.
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@libsql/client';
import { SCHEMA_SQL } from './schema.js';

// `import.meta.url` only resolves correctly in real ESM. Once Netlify's
// bundler compiles this to a single CJS function, `import.meta.url` can come
// through empty and crash `fileURLToPath()` — and *whether* a real `__dirname`
// global is available to fall back on turns out to depend on bundler-internal
// settings we don't control from netlify.toml, so detecting our way around it
// isn't reliable. Instead, this is wrapped in a function that's only ever
// called for the local-dev fallback path below (when TURSO_DATABASE_URL is
// unset) — in production that call never happens, so this code never runs
// there at all, regardless of how the bundler handles it.
function localDbUrl() {
  try {
    const dir = typeof __dirname !== 'undefined'
      ? __dirname
      : path.dirname(fileURLToPath(import.meta.url));
    return `file:${process.env.DB_PATH || path.join(dir, '../../data.db')}`;
  } catch {
    // Last-resort fallback so local dev still works even if both of the
    // above somehow fail — resolves relative to wherever node was launched.
    return `file:${process.env.DB_PATH || './data.db'}`;
  }
}

// In production (Netlify), set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN to point at
// a real Turso database. For local dev/testing, falling back to a local SQLite
// file keeps everything working with zero extra setup.
const DB_URL = process.env.TURSO_DATABASE_URL || localDbUrl();
const AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || undefined;

const client = createClient({ url: DB_URL, authToken: AUTH_TOKEN });

let readyPromise = null;

function ensureReady() {
  if (!readyPromise) {
    readyPromise = (async () => {
      await client.execute('PRAGMA foreign_keys = ON').catch(() => {});
      await client.executeMultiple(SCHEMA_SQL);
    })();
  }
  return readyPromise;
}

function prepare(sql) {
  return {
    async get(...params) {
      await ensureReady();
      const res = await client.execute({ sql, args: params });
      return res.rows[0];
    },
    async all(...params) {
      await ensureReady();
      const res = await client.execute({ sql, args: params });
      return res.rows;
    },
    async run(...params) {
      await ensureReady();
      const res = await client.execute({ sql, args: params });
      return {
        changes: res.rowsAffected,
        lastInsertRowid: res.lastInsertRowid != null ? Number(res.lastInsertRowid) : undefined,
      };
    },
  };
}

// Run several ';'-separated statements as one call (used for occasional bulk
// operations outside the normal prepare/get/all/run pattern).
async function exec(sql) {
  await ensureReady();
  return client.executeMultiple(sql);
}

// Force schema/setup to run and resolve — useful for scripts (seed.js) and for
// warming a serverless cold start deliberately before serving traffic.
async function init() {
  await ensureReady();
}

const db = { prepare, exec, init };

export default db;
