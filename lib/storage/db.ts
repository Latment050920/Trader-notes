import 'server-only';

import { createRequire } from 'node:module';
import fs from 'node:fs';
import { queueWriteDbFile, readDbFile } from './persistence';

const require = createRequire(import.meta.url);

type SqlJsStatic = {
  Database: new (data?: Uint8Array) => any;
};

class SqlJsLoadError extends Error {
  code = 'SQLJS_LOAD_FAILED';
  hint = 'Use nodejs runtime and load sql-wasm.cjs';
}

let SQL: SqlJsStatic | null = null;
let db: any | null = null;

const schemaSql = `
CREATE TABLE IF NOT EXISTS history_orders (
  id TEXT PRIMARY KEY,
  symbol TEXT,
  side TEXT,
  orderType TEXT,
  volume REAL,
  filledVolume REAL,
  limitPrice REAL,
  stopLossPrice REAL,
  avgFillPrice REAL,
  status TEXT,
  updatedAtText TEXT,
  parsedUpdatedAt TEXT,
  profit REAL,
  grossProfit REAL,
  swap REAL,
  commission REAL,
  orderId TEXT UNIQUE,
  importedAt TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
`;

async function ensureSql() {
  if (SQL) return SQL;
  try {
    const initSqlJs = require('sql.js/dist/sql-wasm.cjs');
    const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
    const wasmBinary = fs.readFileSync(wasmPath);
    SQL = await initSqlJs({ wasmBinary });
    return SQL;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const e = new SqlJsLoadError(`Failed loading sql.js: ${message}`);
    (e as any).cause = err;
    throw e;
  }
}

export async function getDb() {
  if (db) return db;
  const sql = await ensureSql();
  const existing = readDbFile();
  db = existing ? new sql.Database(existing) : new sql.Database();
  db.exec(schemaSql);
  await persistDb();
  return db;
}

export async function persistDb() {
  if (!db) return;
  await queueWriteDbFile(db.export());
}
