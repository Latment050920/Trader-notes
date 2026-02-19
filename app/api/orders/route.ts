import { NextRequest, NextResponse } from 'next/server';
import { queryOrders } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const q = sp.get('q') || undefined;
    const status = sp.get('status') || undefined;
    const side = sp.get('side') || undefined;
    const start = sp.get('start') || undefined;
    const end = sp.get('end') || undefined;
    const sort = (sp.get('sort') as 'updatedAtDesc' | 'profitDesc' | null) || 'updatedAtDesc';
    const page = Number(sp.get('page') || '1');
    const pageSize = Number(sp.get('pageSize') || '20');

    const result = await queryOrders({ q, status, side, start, end, sort, page, pageSize });
    return NextResponse.json({ ok: true, items: result.items, total: result.total }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: (err as any)?.code || 'ORDERS_QUERY_FAILED',
          message,
          stack: process.env.NODE_ENV !== 'production' ? (err as any)?.stack : undefined,
        },
      },
      { status: 500 },
    );
  }
}
