import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.json({ ok: true, data: await getSettings() }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: { code: 'SETTINGS_GET_FAILED', message, stack: process.env.NODE_ENV !== 'production' ? (err as any)?.stack : undefined } }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const saved = await updateSettings({
      initialEquity: Number(body?.initialEquity || 0),
      riskFreeRateAnnual: Number(body?.riskFreeRateAnnual || 0),
      tradingDaysPerYear: Number(body?.tradingDaysPerYear || 252),
    });
    return NextResponse.json({ ok: true, data: saved }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: { code: 'SETTINGS_UPDATE_FAILED', message, stack: process.env.NODE_ENV !== 'production' ? (err as any)?.stack : undefined } }, { status: 500 });
  }
}
