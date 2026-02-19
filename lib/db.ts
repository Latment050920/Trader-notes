import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import { getDb, persistDb } from '@/lib/storage/db';
import { DuplicateStrategy, HistoryOrder, ImportErrorRow } from '@/types/order';

function qAll(db: any, sql: string, params: any[] = []) {
  const s = db.prepare(sql);
  s.bind(params);
  const rows: any[] = [];
  while (s.step()) rows.push(s.getAsObject());
  s.free();
  return rows;
}

const columns = 'id,symbol,side,orderType,volume,filledVolume,limitPrice,stopLossPrice,avgFillPrice,status,updatedAtText,parsedUpdatedAt,profit,grossProfit,swap,commission,orderId,importedAt,createdAt';

function mapRow(r: any): HistoryOrder {
  return {
    id: String(r.id), symbol: String(r.symbol || ''), side: String(r.side || ''), orderType: String(r.orderType || ''),
    volume: r.volume == null ? null : Number(r.volume), filledVolume: r.filledVolume == null ? null : Number(r.filledVolume),
    limitPrice: r.limitPrice == null ? null : Number(r.limitPrice), stopLossPrice: r.stopLossPrice == null ? null : Number(r.stopLossPrice),
    avgFillPrice: r.avgFillPrice == null ? null : Number(r.avgFillPrice), status: String(r.status || ''),
    updatedAtText: String(r.updatedAtText || ''), parsedUpdatedAt: r.parsedUpdatedAt ? String(r.parsedUpdatedAt) : null,
    profit: r.profit == null ? null : Number(r.profit), grossProfit: r.grossProfit == null ? null : Number(r.grossProfit),
    swap: r.swap == null ? null : Number(r.swap), commission: r.commission == null ? null : Number(r.commission),
    orderId: String(r.orderId || ''), importedAt: String(r.importedAt), createdAt: String(r.createdAt),
  };
}

export async function listOrders() {
  const db = await getDb();
  return qAll(db, `SELECT ${columns} FROM history_orders ORDER BY COALESCE(parsedUpdatedAt, importedAt) DESC`).map(mapRow);
}

export async function importOrders(rows: Omit<HistoryOrder, 'id' | 'createdAt' | 'importedAt'>[], strategy: DuplicateStrategy, onlyFilled: boolean) {
  const db = await getDb();
  let inserted = 0, updated = 0, skipped = 0;
  const errors: ImportErrorRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      if (!r.orderId) throw new Error('订单编号为空');
      if (onlyFilled && !String(r.status).includes('成交')) { skipped++; continue; }
      const existing = qAll(db, 'SELECT id FROM history_orders WHERE orderId = ?', [r.orderId])[0];
      const now = new Date().toISOString();
      if (existing) {
        if (strategy === 'skip') { skipped++; continue; }
        db.run(`UPDATE history_orders SET symbol=?,side=?,orderType=?,volume=?,filledVolume=?,limitPrice=?,stopLossPrice=?,avgFillPrice=?,status=?,updatedAtText=?,parsedUpdatedAt=?,profit=?,grossProfit=?,swap=?,commission=?,importedAt=? WHERE orderId=?`,
          [r.symbol,r.side,r.orderType,r.volume,r.filledVolume,r.limitPrice,r.stopLossPrice,r.avgFillPrice,r.status,r.updatedAtText,r.parsedUpdatedAt,r.profit,r.grossProfit,r.swap,r.commission,now,r.orderId]);
        updated++;
      } else {
        db.run(`INSERT INTO history_orders (${columns}) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [randomUUID(),r.symbol,r.side,r.orderType,r.volume,r.filledVolume,r.limitPrice,r.stopLossPrice,r.avgFillPrice,r.status,r.updatedAtText,r.parsedUpdatedAt,r.profit,r.grossProfit,r.swap,r.commission,r.orderId,now,now]);
        inserted++;
      }
    } catch (e: any) {
      errors.push({ row: i + 1, reason: e.message || '未知错误', raw: rows[i] as any });
    }
  }
  await persistDb();
  return { inserted, updated, skipped, errors };
}

export async function dashboardSummary() {
  const orders = await listOrders();
  const filled = orders.filter((o) => o.status.includes('成交'));
  const withProfit = filled.filter((o) => o.profit != null);
  const totalProfit = withProfit.reduce((a, b) => a + (b.profit || 0), 0);
  const wins = withProfit.filter((o) => (o.profit || 0) > 0).length;
  const losses = withProfit.filter((o) => (o.profit || 0) <= 0).length;
  const avgProfit = withProfit.length ? totalProfit / withProfit.length : 0;
  const totalSwap = filled.reduce((a, b) => a + (b.swap || 0), 0);
  const totalCommission = filled.reduce((a, b) => a + (b.commission || 0), 0);
  const profitSeries = filled
    .slice()
    .sort((a, b) => String(a.parsedUpdatedAt || a.importedAt).localeCompare(String(b.parsedUpdatedAt || b.importedAt)))
    .map((o, i, arr) => ({ time: o.parsedUpdatedAt || o.updatedAtText || o.importedAt, value: arr.slice(0, i + 1).reduce((acc, x) => acc + (x.profit || 0), 0) }));

  const symbolAgg = Object.entries(filled.reduce((acc: Record<string, number>, o) => {
    acc[o.symbol] = (acc[o.symbol] || 0) + (o.profit || 0);
    return acc;
  }, {})).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([symbol,profit])=>({symbol,profit}));

  return {
    totalOrders: orders.length,
    filledOrders: filled.length,
    totalProfit,
    winRate: (wins + losses) ? (wins / (wins + losses)) * 100 : 0,
    averageProfit: avgProfit,
    totalSwap,
    totalCommission,
    profitSeries,
    symbolAgg,
    profitBuckets: bucket(withProfit.map((o) => o.profit || 0)),
    winRule: '胜率按已成交且 Profit>0 记胜；Profit<=0 记负。',
  };
}

function bucket(values: number[]) {
  if (!values.length) return [];
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const size = span / 8;
  const buckets = Array.from({ length: 8 }, (_, i) => ({ from: min + i * size, to: min + (i + 1) * size, count: 0 }));
  values.forEach((v) => {
    const idx = Math.min(7, Math.floor((v - min) / size));
    buckets[idx].count += 1;
  });
  return buckets;
}

export function parseTime(raw: string) {
  const t = dayjs(raw);
  if (t.isValid()) return t.toISOString();
  return null;
}
