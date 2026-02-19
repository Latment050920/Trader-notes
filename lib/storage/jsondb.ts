import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export type OrderRow = {
  id: string;
  symbol: string;
  side: string;
  orderType: string;
  volume: number | null;
  filledVolume: number | null;
  limitPrice: number | null;
  stopLossPrice: number | null;
  avgFillPrice: number | null;
  status: string;
  updatedAtText: string;
  parsedUpdatedAt: string | null;
  profit: number | null;
  grossProfit: number | null;
  swap: number | null;
  commission: number | null;
  orderId: string;
  importedAt: string;
};

type DbShape = {
  orders: OrderRow[];
  meta: {
    version: number;
    lastImportAt: string | null;
  };
};

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'orders.json');

function defaultDb(): DbShape {
  return {
    orders: [],
    meta: { version: 1, lastImportAt: null },
  };
}

export function ensureDbFile() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify(defaultDb(), null, 2), 'utf8');
}

export function readDb(): DbShape {
  ensureDbFile();
  const raw = fs.readFileSync(dbPath, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.orders) || !parsed.meta) return defaultDb();
    return parsed as DbShape;
  } catch {
    return defaultDb();
  }
}

let writeChain: Promise<void> = Promise.resolve();

function writeDbAtomic(data: DbShape) {
  ensureDbFile();
  const tmp = `${dbPath}.${randomUUID()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, dbPath);
}

export function writeDbQueued(data: DbShape) {
  writeChain = writeChain.then(() => writeDbAtomic(data));
  return writeChain;
}

export function getDbPath() {
  return dbPath;
}
