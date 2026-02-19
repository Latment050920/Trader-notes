import { NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { listTrades } from '@/lib/db';
import { aggregate, computeTotalR } from '@/lib/metrics';

export const runtime = 'nodejs';

export async function GET() {
  const trades = await listTrades();
  const now = dayjs();
  const thisWeek = trades.filter((t) => dayjs(t.entryTime).isAfter(now.startOf('week')));
  const thisMonth = trades.filter((t) => dayjs(t.entryTime).isAfter(now.startOf('month')));

  const byAsset = Object.entries(
    trades.reduce((acc: Record<string, { count: number; totalR: number }>, t) => {
      acc[t.assetClass] = acc[t.assetClass] || { count: 0, totalR: 0 };
      acc[t.assetClass].count += 1;
      acc[t.assetClass].totalR += computeTotalR(t) || 0;
      return acc;
    }, {}),
  ).map(([key, value]) => ({ key, ...value }));

  const bySide = Object.entries(
    trades.reduce((acc: Record<string, { count: number; totalR: number }>, t) => {
      acc[t.side] = acc[t.side] || { count: 0, totalR: 0 };
      acc[t.side].count += 1;
      acc[t.side].totalR += computeTotalR(t) || 0;
      return acc;
    }, {}),
  ).map(([key, value]) => ({ key, ...value }));

  const equityCurve = trades
    .slice()
    .sort((a, b) => a.entryTime.localeCompare(b.entryTime))
    .map((t, i, arr) => ({
      time: t.entryTime,
      value: arr.slice(0, i + 1).reduce((acc, item) => acc + (computeTotalR(item) || 0), 0),
    }));

  return NextResponse.json({
    all: aggregate(trades),
    week: aggregate(thisWeek),
    month: aggregate(thisMonth),
    byAsset,
    bySide,
    equityCurve,
  });
}
