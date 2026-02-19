import { NextRequest, NextResponse } from 'next/server';
import { dashboardCharts } from '@/lib/db';

export const runtime = 'nodejs';

type CacheVal = { expire: number; data: unknown };
const cache = new Map<string, CacheVal>();
const TTL_MS = 10_000;

function keyFrom(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  return JSON.stringify({
    start: p.get('start') || '',
    end: p.get('end') || '',
    symbol: p.get('symbol') || '',
    status: p.get('status') || '',
    rollingWindow: p.get('rollingWindow') || '20',
  });
}

export async function GET(req: NextRequest) {
  try {
    const key = keyFrom(req);
    const now = Date.now();
    const hit = cache.get(key);
    if (hit && hit.expire > now) {
      return NextResponse.json(hit.data, { status: 200 });
    }

    const sp = req.nextUrl.searchParams;
    const data = await dashboardCharts({
      start: sp.get('start') || undefined,
      end: sp.get('end') || undefined,
      symbol: sp.get('symbol') || undefined,
      status: sp.get('status') || undefined,
      rollingWindow: Number(sp.get('rollingWindow') || '20'),
    });

    cache.set(key, { expire: now + TTL_MS, data });
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'DASHBOARD_CHARTS_FAILED',
          message,
          stack: process.env.NODE_ENV !== 'production' ? (err as any)?.stack : undefined,
        },
      },
      { status: 500 },
    );
  }
}
