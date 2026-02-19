import path from 'path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { queueWriteDbFile, readDbFile } from './persistence';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

const schemaSql = `
CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,
  assetClass TEXT NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  entryTime TEXT NOT NULL,
  closeTime TEXT,
  entryPrice REAL,
  stopLoss REAL,
  closePrice REAL,
  qty REAL,
  notional REAL,
  fee REAL,
  slippage REAL,
  notes TEXT,
  extra TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS take_profits (
  id TEXT PRIMARY KEY,
  tradeId TEXT NOT NULL,
  price REAL NOT NULL,
  label TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS partial_exits (
  id TEXT PRIMARY KEY,
  tradeId TEXT NOT NULL,
  price REAL NOT NULL,
  qtyPercent REAL NOT NULL,
  time TEXT,
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS trade_tags (
  id TEXT PRIMARY KEY,
  tradeId TEXT NOT NULL,
  tag TEXT NOT NULL
);
`;

async function ensureSql() {
  if (SQL) return SQL;
  SQL = await initSqlJs({
    locateFile: () => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
  });
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
  const exported = db.export();
  await queueWriteDbFile(exported);
}

export async function resetDb() {
  db = null;
  await getDb();
}
