import { randomUUID } from 'node:crypto';
import dayjs from 'dayjs';
import { DuplicateStrategy, HistoryOrder, ImportErrorRow } from '@/types/order';
import { OrderRow, readDb, writeDbQueued } from '@/lib/storage/jsondb';

function toHistoryOrder(r: OrderRow): HistoryOrder {
  return {
    id: r.id,
    symbol: r.symbol,
    side: r.side,
    orderType: r.orderType,
    volume: r.volume,
    filledVolume: r.filledVolume,
    limitPrice: r.limitPrice,
    stopLossPrice: r.stopLossPrice,
    avgFillPrice: r.avgFillPrice,
    status: r.status,
    updatedAtText: r.updatedAtText,
    parsedUpdatedAt: r.parsedUpdatedAt,
    profit: r.profit,
    grossProfit: r.grossProfit,
    swap: r.swap,
    commission: r.commission,
    orderId: r.orderId,
    importedAt: r.importedAt,
    createdAt: r.importedAt,
  };
}

export async function listOrders() {
  const db = readDb();
  return db.orders
    .slice()
    .sort((a, b) => String(b.parsedUpdatedAt || b.updatedAtText || b.importedAt).localeCompare(String(a.parsedUpdatedAt || a.updatedAtText || a.importedAt)))
    .map(toHistoryOrder);
}

export async function importOrders(rows: Omit<HistoryOrder, 'id' | 'createdAt' | 'importedAt'>[], strategy: DuplicateStrategy, onlyFilled: boolean) {
  const db = readDb();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: ImportErrorRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      if (!r.orderId) throw new Error('订单编号为空');
      if (onlyFilled && !String(r.status).includes('成交')) {
        skipped++;
        continue;
      }
      const idx = db.orders.findIndex((o) => o.orderId === r.orderId);
      const now = new Date().toISOString();
      const row: OrderRow = {
        id: idx >= 0 ? db.orders[idx].id : randomUUID(),
        symbol: r.symbol,
        side: r.side,
        orderType: r.orderType,
        volume: r.volume,
        filledVolume: r.filledVolume,
        limitPrice: r.limitPrice,
        stopLossPrice: r.stopLossPrice,
        avgFillPrice: r.avgFillPrice,
        status: r.status,
        updatedAtText: r.updatedAtText,
        parsedUpdatedAt: r.parsedUpdatedAt,
        profit: r.profit,
        grossProfit: r.grossProfit,
        swap: r.swap,
        commission: r.commission,
        orderId: r.orderId,
        importedAt: now,
      };

      if (idx >= 0) {
        if (strategy === 'skip') {
          skipped++;
          continue;
        }
        db.orders[idx] = row;
        updated++;
      } else {
        db.orders.push(row);
        inserted++;
      }
    } catch (e: any) {
      errors.push({ row: i + 1, reason: e?.message || '未知错误', raw: rows[i] as any });
    }
  }

  db.meta.lastImportAt = new Date().toISOString();
  await writeDbQueued(db);
  return { inserted, updated, skipped, errors };
}

export async function queryOrders(params: {
  q?: string;
  status?: string;
  side?: string;
  start?: string;
  end?: string;
  sort?: 'updatedAtDesc' | 'profitDesc';
  page?: number;
  pageSize?: number;
}) {
  const all = await listOrders();
  const q = params.q?.toLowerCase();
  let filtered = all.filter((o) => {
    if (q && !(`${o.symbol} ${o.orderId}`.toLowerCase().includes(q))) return false;
    if (params.status && params.status !== '全部' && o.status !== params.status) return false;
    if (params.side && params.side !== '全部' && o.side !== params.side) return false;
    const key = String(o.parsedUpdatedAt || o.updatedAtText || o.importedAt).slice(0, 10);
    if (params.start && key < params.start) return false;
    if (params.end && key > params.end) return false;
    return true;
  });

  if (params.sort === 'profitDesc') {
    filtered = filtered.sort((a, b) => (b.profit || 0) - (a.profit || 0));
  }

  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(200, Math.max(1, params.pageSize || 20));
  const startIdx = (page - 1) * pageSize;
  return { items: filtered.slice(startIdx, startIdx + pageSize), total: filtered.length };
}


function bucket(values: number[]) {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const size = span / 8;
  const buckets = Array.from({ length: 8 }, (_, i) => ({ from: min + i * size, to: min + (i + 1) * size, count: 0 }));
  values.forEach((v) => {
    const idx = Math.min(7, Math.floor((v - min) / size));
    buckets[idx].count += 1;
  });
  return buckets;
}

export async function dashboardSummary() {
  const orders = await listOrders();
  const filled = orders.filter((o) => o.status.includes('成交'));
  const withProfit = filled.filter((o) => o.profit != null);
  const totalProfit = withProfit.reduce((a, b) => a + (b.profit || 0), 0);
  const wins = withProfit.filter((o) => (o.profit || 0) > 0).length;
  const losses = withProfit.filter((o) => (o.profit || 0) < 0).length;
  const avgProfit = withProfit.length ? totalProfit / withProfit.length : 0;
  const totalSwap = filled.reduce((a, b) => a + (b.swap || 0), 0);
  const totalCommission = filled.reduce((a, b) => a + (b.commission || 0), 0);

  const profitSeries = filled
    .slice()
    .sort((a, b) => String(a.parsedUpdatedAt || a.importedAt).localeCompare(String(b.parsedUpdatedAt || b.importedAt)))
    .map((o, i, arr) => ({
      time: o.parsedUpdatedAt || o.updatedAtText || o.importedAt,
      value: arr.slice(0, i + 1).reduce((acc, x) => acc + (x.profit || 0), 0),
    }));

  const topSymbolsByProfit = Object.entries(
    filled.reduce((acc: Record<string, number>, o) => {
      acc[o.symbol] = (acc[o.symbol] || 0) + (o.profit || 0);
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([symbol, profit]) => ({ symbol, profit }));

  return {
    totalOrders: orders.length,
    filledOrders: filled.length,
    totalProfit,
    winRate: wins + losses ? (wins / (wins + losses)) * 100 : 0,
    averageProfit: avgProfit,
    totalSwap,
    totalCommission,
    topSymbolsByProfit,
    profitSeries,
    profitBuckets: bucket(withProfit.map((o) => o.profit || 0)),
    meta: {
      winRateRule: '仅统计已成交且 Profit>0 为胜，Profit<0 为负，Profit=0 不计入胜率',
    },
  };
}

export function parseTime(raw: string) {
  const t = dayjs(raw);
  if (t.isValid()) return t.toISOString();
  return null;
}
