import { NextRequest, NextResponse } from 'next/server';
import { dashboardCharts, dashboardMetrics } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const filters = {
      start: sp.get('start') || undefined,
      end: sp.get('end') || undefined,
      symbol: sp.get('symbol') || undefined,
      status: sp.get('status') || undefined,
    };
    const [summary, charts] = await Promise.all([dashboardMetrics(filters), dashboardCharts({ ...filters, rollingWindow: Number(sp.get('rollingWindow') || '20') })]);
    return NextResponse.json({ ok: true, ...summary, charts }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: { code: 'DASHBOARD_SUMMARY_FAILED', message, stack: process.env.NODE_ENV !== 'production' ? (err as any)?.stack : undefined } }, { status: 500 });
  }
}
