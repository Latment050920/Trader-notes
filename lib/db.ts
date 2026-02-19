import { randomUUID } from 'node:crypto';
import dayjs from 'dayjs';
import { AccountSettings, Cashflow, DuplicateStrategy, HistoryOrder, ImportErrorRow } from '@/types/order';
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

export async function listCashflows() {
  const db = readDb();
  return db.cashflows.slice().sort((a, b) => b.dateTime.localeCompare(a.dateTime));
}

export async function createCashflow(input: { dateTime: string; amount: number; note?: string }) {
  const db = readDb();
  const row: Cashflow = {
    id: randomUUID(),
    dateTime: input.dateTime,
    amount: input.amount,
    note: input.note || '',
    createdAt: new Date().toISOString(),
  };
  db.cashflows.push(row);
  await writeDbQueued(db);
  return row;
}

export async function deleteCashflow(id: string) {
  const db = readDb();
  db.cashflows = db.cashflows.filter((c) => c.id !== id);
  await writeDbQueued(db);
}

export async function getSettings() {
  return readDb().settings;
}

export async function updateSettings(next: AccountSettings) {
  const db = readDb();
  db.settings = {
    initialEquity: Number(next.initialEquity),
    riskFreeRateAnnual: Number(next.riskFreeRateAnnual),
    tradingDaysPerYear: Number(next.tradingDaysPerYear || 252),
  };
  await writeDbQueued(db);
  return db.settings;
}

function sampleStd(values: number[]) {
  if (values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, x) => acc + (x - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export async function dashboardMetrics() {
  const db = readDb();
  const settings = db.settings;
  const filled = db.orders.filter((o) => (o.status || '').includes('成交'));

  const orderNet = filled
    .map((o) => ({
      date: String(o.parsedUpdatedAt || o.updatedAtText || o.importedAt).slice(0, 10),
      net: (o.profit || 0) + (o.swap || 0) - (o.commission || 0),
      symbol: o.symbol,
      time: o.parsedUpdatedAt || o.updatedAtText || o.importedAt,
    }))
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));

  const dailyNetMap: Record<string, number> = {};
  for (const x of orderNet) dailyNetMap[x.date] = (dailyNetMap[x.date] || 0) + x.net;

  const dailyCfMap: Record<string, number> = {};
  for (const c of db.cashflows) {
    const d = String(c.dateTime).slice(0, 10);
    dailyCfMap[d] = (dailyCfMap[d] || 0) + c.amount;
  }

  const dates = Array.from(new Set([...Object.keys(dailyNetMap), ...Object.keys(dailyCfMap)])).sort();
  let prevEquity = settings.initialEquity;
  let peak = prevEquity;
  let maxDD = 0;
  let maxDDPct = 0;
  const excessReturns: number[] = [];
  const validReturns: number[] = [];
  const equityDaily: Array<{ date: string; equityStart: number; equityEnd: number; dailyNetPnL: number; dailyCashflow: number; return: number | null }> = [];

  const rfDaily = settings.riskFreeRateAnnual / settings.tradingDaysPerYear;

  for (const d of dates) {
    const dailyNetPnL = dailyNetMap[d] || 0;
    const dailyCashflow = dailyCfMap[d] || 0;
    const equityStart = prevEquity;
    const r = equityStart > 0 ? dailyNetPnL / equityStart : null;
    const equityEnd = equityStart + dailyNetPnL + dailyCashflow;

    if (r != null) {
      validReturns.push(r);
      excessReturns.push(r - rfDaily);
    }

    peak = Math.max(peak, equityEnd);
    const dd = peak - equityEnd;
    const ddPct = peak > 0 ? dd / peak : 0;
    if (dd > maxDD) maxDD = dd;
    if (ddPct > maxDDPct) maxDDPct = ddPct;

    equityDaily.push({ date: d, equityStart, equityEnd, dailyNetPnL, dailyCashflow, return: r });
    prevEquity = equityEnd;
  }

  const sharpe = calcSharpe(excessReturns, settings.tradingDaysPerYear);
  const sortino = calcSortino(excessReturns, settings.tradingDaysPerYear);

  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];
  const spanDays = firstDate && lastDate ? Math.max(1, dayjs(lastDate).diff(dayjs(firstDate), 'day')) : 0;
  let cagr: number | null = null;
  if (spanDays >= 30 && settings.initialEquity > 0 && prevEquity > 0) {
    cagr = (prevEquity / settings.initialEquity) ** (365 / spanDays) - 1;
  }
  const calmar = cagr != null && maxDDPct > 0 ? cagr / maxDDPct : null;

  const grossWin = orderNet.reduce((a, b) => a + Math.max(b.net, 0), 0);
  const grossLoss = orderNet.reduce((a, b) => a + Math.abs(Math.min(b.net, 0)), 0);
  const profitFactor = grossLoss === 0 ? null : grossWin / grossLoss;
  const expectancy = orderNet.length ? orderNet.reduce((a, b) => a + b.net, 0) / orderNet.length : null;

  const streak = calcStreak(orderNet.map((x) => x.net));

  const topSymbolsByProfit = Object.entries(
    orderNet.reduce((acc: Record<string, number>, o) => {
      acc[o.symbol] = (acc[o.symbol] || 0) + o.net;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([symbol, profit]) => ({ symbol, profit }));

  return {
    settings,
    metrics: {
      sharpe,
      sortino,
      maxDD,
      maxDDPct,
      cagr,
      calmar,
      profitFactor,
      expectancy,
      maxConsecutiveLosses: streak.maxLossCount,
      maxConsecutiveWins: streak.maxWinCount,
      maxConsecutiveLossAmount: streak.maxLossAmount,
      maxConsecutiveWinAmount: streak.maxWinAmount,
      sampleNote: validReturns.length < 20 ? '不可用（样本不足）' : undefined,
    },
    series: { equityDaily },
    summary: {
      totalOrders: db.orders.length,
      filledOrders: filled.length,
      totalProfit: orderNet.reduce((a, b) => a + b.net, 0),
      totalSwap: filled.reduce((a, b) => a + (b.swap || 0), 0),
      totalCommission: filled.reduce((a, b) => a + (b.commission || 0), 0),
      topSymbolsByProfit,
    },
    meta: {
      winDefinition: '净收益>0 为胜，净收益<0 为负，净收益=0 不计入胜率',
      returnDefinition: '当日净收益 / 当日初始权益（不含入金出金）',
    },
  };
}

function calcSharpe(excess: number[], days: number) {
  if (excess.length < 20) return null;
  const mean = excess.reduce((a, b) => a + b, 0) / excess.length;
  const std = sampleStd(excess);
  if (!std || std === 0) return null;
  return (mean / std) * Math.sqrt(days);
}

function calcSortino(excess: number[], days: number) {
  if (excess.length < 20) return null;
  const mean = excess.reduce((a, b) => a + b, 0) / excess.length;
  const down = excess.filter((x) => x < 0);
  const std = sampleStd(down);
  if (!std || std === 0) return null;
  return (mean / std) * Math.sqrt(days);
}

function calcStreak(values: number[]) {
  let curWin = 0;
  let curLoss = 0;
  let curWinAmt = 0;
  let curLossAmt = 0;
  let maxWinCount = 0;
  let maxLossCount = 0;
  let maxWinAmount = 0;
  let maxLossAmount = 0;

  for (const v of values) {
    if (v > 0) {
      curWin += 1;
      curWinAmt += v;
      curLoss = 0;
      curLossAmt = 0;
    } else if (v < 0) {
      curLoss += 1;
      curLossAmt += v;
      curWin = 0;
      curWinAmt = 0;
    } else {
      curWin = 0;
      curWinAmt = 0;
      curLoss = 0;
      curLossAmt = 0;
    }
    maxWinCount = Math.max(maxWinCount, curWin);
    maxLossCount = Math.max(maxLossCount, curLoss);
    maxWinAmount = Math.max(maxWinAmount, curWinAmt);
    maxLossAmount = Math.min(maxLossAmount, curLossAmt);
  }

  return {
    maxWinCount,
    maxLossCount,
    maxWinAmount,
    maxLossAmount: Math.abs(maxLossAmount),
  };
}

export function parseTime(raw: string) {
  const t = dayjs(raw);
  if (t.isValid()) return t.toISOString();
  return null;
}
