import { randomUUID } from 'node:crypto';
import dayjs from 'dayjs';
import { AccountSettings, Cashflow, DuplicateStrategy, HistoryOrder, ImportErrorRow } from '@/types/order';
import { OrderRow, readDb, writeDbQueued } from '@/lib/storage/jsondb.server';

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

type Prepared = {
  settings: AccountSettings;
  orders: Array<{ date: string; net: number; symbol: string; side: string; orderType: string; status: string; ts: string }>;
  dailyNetMap: Record<string, number>;
  dailyCfMap: Record<string, number>;
  dates: string[];
};

function prepareFilteredDataset(filters?: { start?: string; end?: string; symbol?: string; status?: string }): Prepared {
  const db = readDb();
  const settings = db.settings;
  const statusFilter = filters?.status && filters.status !== '全部' ? filters.status : '已成交';

  let rows = db.orders.slice();
  if (filters?.symbol && filters.symbol !== 'ALL') rows = rows.filter((o) => o.symbol === filters.symbol);
  if (statusFilter === '已成交') rows = rows.filter((o) => (o.status || '').includes('成交'));
  else if (statusFilter) rows = rows.filter((o) => o.status === statusFilter);

  const orders = rows
    .map((o) => {
      const ts = o.parsedUpdatedAt || o.updatedAtText || o.importedAt;
      const date = String(ts).slice(0, 10);
      return {
        date,
        net: (o.profit || 0) + (o.swap || 0) - (o.commission || 0),
        symbol: o.symbol,
        side: o.side,
        orderType: o.orderType,
        status: o.status,
        ts,
      };
    })
    .filter((o) => {
      if (filters?.start && o.date < filters.start) return false;
      if (filters?.end && o.date > filters.end) return false;
      return true;
    })
    .sort((a, b) => String(a.ts).localeCompare(String(b.ts)));

  const dailyNetMap: Record<string, number> = {};
  for (const x of orders) dailyNetMap[x.date] = (dailyNetMap[x.date] || 0) + x.net;

  const dailyCfMap: Record<string, number> = {};
  for (const c of db.cashflows) {
    const d = String(c.dateTime).slice(0, 10);
    if (filters?.start && d < filters.start) continue;
    if (filters?.end && d > filters.end) continue;
    dailyCfMap[d] = (dailyCfMap[d] || 0) + c.amount;
  }

  const dates = Array.from(new Set([...Object.keys(dailyNetMap), ...Object.keys(dailyCfMap)])).sort();
  return { settings, orders, dailyNetMap, dailyCfMap, dates };
}

function buildRollingSeries(values: number[], window: number) {
  const win: number[] = [];
  const lose: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    win.push(values[i] > 0 ? 1 : 0);
    lose.push(values[i]);
    if (i >= window) {
      sum -= values[i - window];
    }
  }

  let rollingWin = 0;
  let rollingLoss = 0;
  const out: Array<{ i: number; rollingWinRate: number; rollingAvgProfit: number; rollingStdProfit: number }> = [];
  for (let i = 0; i < values.length; i++) {
    rollingWin += win[i];
    rollingLoss += values[i];
    if (i >= window) {
      rollingWin -= win[i - window];
      rollingLoss -= values[i - window];
    }
    const size = Math.min(window, i + 1);
    const avg = rollingLoss / size;
    let varAcc = 0;
    for (let j = i - size + 1; j <= i; j++) varAcc += (values[j] - avg) ** 2;
    const std = size > 1 ? Math.sqrt(varAcc / (size - 1)) : 0;
    out.push({ i, rollingWinRate: rollingWin / size, rollingAvgProfit: avg, rollingStdProfit: std });
  }
  return out;
}

export async function dashboardMetrics(filters?: { start?: string; end?: string; symbol?: string; status?: string }) {
  const { settings, orders, dailyNetMap, dailyCfMap, dates } = prepareFilteredDataset(filters);

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

  const grossWin = orders.reduce((a, b) => a + Math.max(b.net, 0), 0);
  const grossLoss = orders.reduce((a, b) => a + Math.abs(Math.min(b.net, 0)), 0);
  const profitFactor = grossLoss === 0 ? null : grossWin / grossLoss;
  const expectancy = orders.length ? orders.reduce((a, b) => a + b.net, 0) / orders.length : null;

  const streak = calcStreak(orders.map((x) => x.net));

  const topSymbolsByProfit = Object.entries(
    orders.reduce((acc: Record<string, number>, o) => {
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
      totalOrders: orders.length,
      filledOrders: orders.length,
      totalProfit: orders.reduce((a, b) => a + b.net, 0),
      totalSwap: 0,
      totalCommission: 0,
      topSymbolsByProfit,
    },
    meta: {
      winDefinition: '净收益>0 为胜，净收益<0 为负，净收益=0 不计入胜率',
      returnDefinition: '当日净收益 / 当日初始权益（不含入金出金）',
    },
  };
}

function aggregateBreakdown(orders: Prepared['orders'], key: 'symbol' | 'side' | 'orderType') {
  const map = new Map<string, { key: string; count: number; sumProfit: number; win: number }>();
  for (const o of orders) {
    const k = o[key] || '未知';
    const row = map.get(k) || { key: k, count: 0, sumProfit: 0, win: 0 };
    row.count += 1;
    row.sumProfit += o.net;
    if (o.net > 0) row.win += 1;
    map.set(k, row);
  }
  return Array.from(map.values())
    .map((x) => ({ ...x, avgProfit: x.count ? x.sumProfit / x.count : 0, winRate: x.count ? x.win / x.count : 0 }))
    .sort((a, b) => b.sumProfit - a.sumProfit);
}

function histogram(values: number[], bins = 20) {
  if (!values.length) return [] as Array<{ bin: string; count: number }>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = max === min ? 1 : (max - min) / bins;
  const counts = Array.from({ length: bins }, () => 0);
  for (const v of values) {
    const idx = Math.min(bins - 1, Math.floor((v - min) / width));
    counts[idx] += 1;
  }
  return counts.map((count, i) => ({ bin: `${(min + i * width).toFixed(2)}~${(min + (i + 1) * width).toFixed(2)}`, count }));
}

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  return sorted[base];
}

export async function dashboardCharts(filters: { start?: string; end?: string; symbol?: string; status?: string; rollingWindow?: number }) {
  const { orders, dates, dailyNetMap } = prepareFilteredDataset(filters);
  const rollingWindow = Math.max(10, Math.min(100, Number(filters.rollingWindow || 20)));

  let cum = 0;
  const equityCurve = orders.map((o) => {
    cum += o.net;
    return { t: o.ts, v: Number(cum.toFixed(6)) };
  });

  let dayCum = 0;
  const equityCurveDaily = dates.map((d) => {
    dayCum += dailyNetMap[d] || 0;
    return { t: d, v: Number(dayCum.toFixed(6)) };
  });

  const profitPerTrade = orders.map((o) => ({ t: o.ts, v: o.net, symbol: o.symbol }));
  const rollingBase = buildRollingSeries(orders.map((o) => o.net), rollingWindow);
  const rollingWinRate = rollingBase.map((x, idx) => ({ t: orders[idx]?.ts || String(idx), v: x.rollingWinRate }));
  const rollingAvgProfit = rollingBase.map((x, idx) => ({ t: orders[idx]?.ts || String(idx), v: x.rollingAvgProfit }));
  const rollingStdProfit = rollingBase.map((x, idx) => ({ t: orders[idx]?.ts || String(idx), v: x.rollingStdProfit }));

  const values = orders.map((o) => o.net);
  const sortedVals = values.slice().sort((a, b) => a - b);

  const byStatusMap: Record<string, number> = {};
  for (const o of orders) byStatusMap[o.status] = (byStatusMap[o.status] || 0) + 1;

  const dowHourMap = new Map<string, { dow: number; hour: number; count: number; sumProfit: number }>();
  for (const o of orders) {
    const t = dayjs(o.ts);
    const dow = t.day();
    const hour = t.hour();
    const key = `${dow}-${hour}`;
    const row = dowHourMap.get(key) || { dow, hour, count: 0, sumProfit: 0 };
    row.count += 1;
    row.sumProfit += o.net;
    dowHourMap.set(key, row);
  }

  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const std = values.length > 1 ? sampleStd(values) || 0 : 0;
  const median = quantile(sortedVals, 0.5);

  return {
    ok: true,
    meta: {
      winRateDefinition: '净收益>0 为胜，净收益<=0 不计胜',
      timezone: 'local',
      rollingWindow,
    },
    kpis: {
      totalOrders: orders.length,
      totalProfit: values.reduce((a, b) => a + b, 0),
      avgProfit: avg,
      medianProfit: median,
      stdProfit: std,
    },
    series: {
      equityCurve,
      equityCurveDaily,
      profitPerTrade,
      rollingWinRate,
      rollingAvgProfit,
      rollingStdProfit,
    },
    dist: {
      profitHistogram: histogram(values, 20),
      profitBox: {
        min: sortedVals[0] ?? null,
        q1: quantile(sortedVals, 0.25),
        median,
        q3: quantile(sortedVals, 0.75),
        max: sortedVals[sortedVals.length - 1] ?? null,
      },
    },
    breakdown: {
      bySymbol: aggregateBreakdown(orders, 'symbol').slice(0, 10),
      bySide: aggregateBreakdown(orders, 'side'),
      byType: aggregateBreakdown(orders, 'orderType'),
      byStatus: Object.entries(byStatusMap).map(([key, count]) => ({ key, count })),
    },
    heatmap: {
      dowHour: Array.from(dowHourMap.values()),
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
