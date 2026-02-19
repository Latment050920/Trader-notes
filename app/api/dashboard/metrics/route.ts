import { NextResponse } from 'next/server';
import { dashboardMetrics } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.json({ ok: true, ...(await dashboardMetrics()) }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: { code: 'DASHBOARD_METRICS_FAILED', message, stack: process.env.NODE_ENV !== 'production' ? (err as any)?.stack : undefined } }, { status: 500 });
  }
}
