import { NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { listTrades } from '@/lib/db';
import { aggregate, computeTotalR } from '@/lib/metrics';

export async function GET() {
  const trades = listTrades();
  const now = dayjs();
  const thisWeek = trades.filter((t) => dayjs(t.entryTime).isAfter(now.startOf('week')));
  const thisMonth = trades.filter((t) => dayjs(t.entryTime).isAfter(now.startOf('month')));
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
    equityCurve,
  });
}
