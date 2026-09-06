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
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@libsql/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In production (Netlify), set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN to point at
// a real Turso database. For local dev/testing, falling back to a local SQLite
// file keeps everything working with zero extra setup.
const DB_URL = process.env.TURSO_DATABASE_URL || `file:${process.env.DB_PATH || path.join(__dirname, '../../data.db')}`;
const AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || undefined;

const client = createClient({ url: DB_URL, authToken: AUTH_TOKEN });

let readyPromise = null;

function ensureReady() {
  if (!readyPromise) {
    readyPromise = (async () => {
      await client.execute('PRAGMA foreign_keys = ON').catch(() => {});
      const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
      await client.executeMultiple(schema);
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
