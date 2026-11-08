// Database access through libSQL (SQLite-compatible).
// Local development: a SQLite file in ./data. Production: a free Turso database,
// set with TURSO_DATABASE_URL and TURSO_AUTH_TOKEN (hosting filesystems are often wiped on restart).
import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
let url = process.env.TURSO_DATABASE_URL;
if (!url) {
  const dataDir = path.join(here, '..', 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  url = `file:${path.join(dataDir, 'fluentstep.db').replace(/\\/g, '/')}`;
}
const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
export const dbLocation = process.env.TURSO_DATABASE_URL ? 'Turso (remote)' : 'local file data/fluentstep.db';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pass_hash TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  level TEXT NOT NULL DEFAULT 'beginner',
  assessment TEXT,
  tamil_help INTEGER NOT NULL DEFAULT 1,
  daily_goal_min INTEGER NOT NULL DEFAULT 30,
  goal_text TEXT,
  plan TEXT,
  reminder_time TEXT,
  onboarded INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  module TEXT NOT NULL,
  skill TEXT NOT NULL,
  minutes REAL NOT NULL DEFAULT 0,
  score REAL,
  max_score REAL,
  detail TEXT,
  day TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_act_user_day ON activities(user_id, day);
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  mode TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT,
  messages TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS journal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  entries TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, day)
);
CREATE TABLE IF NOT EXISTS vocab (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  word TEXT NOT NULL,
  meaning TEXT,
  tamil TEXT,
  example TEXT,
  source TEXT,
  box INTEGER NOT NULL DEFAULT 0,
  due_day TEXT NOT NULL,
  reviews INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, word)
);
CREATE TABLE IF NOT EXISTS mistakes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  wrong TEXT,
  right TEXT,
  why TEXT,
  count INTEGER NOT NULL DEFAULT 1,
  last_seen TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, type)
);
CREATE TABLE IF NOT EXISTS favorites (
  user_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  ref TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(user_id, kind, ref)
);
CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  added_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);`;

export const initDb = () => client.executeMultiple(SCHEMA);

const exec = (sql, args) => client.execute({ sql, args: args.map((a) => (a === undefined ? null : a)) });
export const q = {
  get: async (sql, ...args) => (await exec(sql, args)).rows[0],
  all: async (sql, ...args) => (await exec(sql, args)).rows,
  run: async (sql, ...args) => {
    const r = await exec(sql, args);
    return { lastInsertRowid: r.lastInsertRowid == null ? null : Number(r.lastInsertRowid), changes: r.rowsAffected };
  },
};

/** Remove a user and everything they own (no foreign-key cascades over a remote connection). */
export async function deleteUserData(userId) {
  await client.batch(
    ['sessions', 'activities', 'conversations', 'journal', 'vocab', 'mistakes', 'favorites'].map((t) => ({ sql: `DELETE FROM ${t} WHERE user_id = ?`, args: [userId] }))
      .concat([{ sql: 'UPDATE videos SET added_by = NULL WHERE added_by = ?', args: [userId] }, { sql: 'DELETE FROM users WHERE id = ?', args: [userId] }]),
    'write',
  );
}

export const json = (s, fallback = null) => {
  if (s == null) return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
};
