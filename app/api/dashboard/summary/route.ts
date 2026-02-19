import { NextResponse } from 'next/server';
import { dashboardSummary } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.json({ ok: true, data: await dashboardSummary() }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: {
          message,
          name: (err as any)?.name,
          stack: process.env.NODE_ENV !== 'production' ? (err as any)?.stack : undefined,
        },
      },
      { status: 500 },
    );
  }
}
