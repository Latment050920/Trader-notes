import path from 'path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { queueWriteDbFile, readDbFile } from './persistence';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

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
  SQL = await initSqlJs({ locateFile: () => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm') });
  return SQL;
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
