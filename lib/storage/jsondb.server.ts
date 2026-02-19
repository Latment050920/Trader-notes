if (typeof window !== 'undefined') {
  throw new Error('jsondb is server-only and cannot run in browser');
}

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AccountSettings, Cashflow } from '@/types/order';

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
  cashflows: Cashflow[];
  settings: AccountSettings;
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
    cashflows: [],
    settings: {
      initialEquity: 10000,
      riskFreeRateAnnual: 0,
      tradingDaysPerYear: 252,
    },
    meta: { version: 2, lastImportAt: null },
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
    const d = defaultDb();
    return {
      orders: Array.isArray(parsed?.orders) ? parsed.orders : d.orders,
      cashflows: Array.isArray(parsed?.cashflows) ? parsed.cashflows : d.cashflows,
      settings: {
        initialEquity: Number(parsed?.settings?.initialEquity ?? d.settings.initialEquity),
        riskFreeRateAnnual: Number(parsed?.settings?.riskFreeRateAnnual ?? d.settings.riskFreeRateAnnual),
        tradingDaysPerYear: Number(parsed?.settings?.tradingDaysPerYear ?? d.settings.tradingDaysPerYear),
      },
      meta: {
        version: Number(parsed?.meta?.version ?? d.meta.version),
        lastImportAt: parsed?.meta?.lastImportAt ?? d.meta.lastImportAt,
      },
    };
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
