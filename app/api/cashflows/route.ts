import { NextRequest, NextResponse } from 'next/server';
import { createCashflow, deleteCashflow, listCashflows } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.json({ ok: true, items: await listCashflows() }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: { code: 'CASHFLOW_LIST_FAILED', message, stack: process.env.NODE_ENV !== 'production' ? (err as any)?.stack : undefined } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const amount = Number(body?.amount);
    if (!Number.isFinite(amount) || amount === 0) {
      return NextResponse.json({ ok: false, error: { code: 'INVALID_AMOUNT', message: '金额必须是非零数字' } }, { status: 400 });
    }
    const dateTime = body?.dateTime || new Date().toISOString();
    const row = await createCashflow({ amount, dateTime, note: body?.note || '' });
    return NextResponse.json({ ok: true, item: row }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: { code: 'CASHFLOW_CREATE_FAILED', message, stack: process.env.NODE_ENV !== 'production' ? (err as any)?.stack : undefined } }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ ok: false, error: { code: 'MISSING_ID', message: '缺少流水ID' } }, { status: 400 });
    await deleteCashflow(id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: { code: 'CASHFLOW_DELETE_FAILED', message, stack: process.env.NODE_ENV !== 'production' ? (err as any)?.stack : undefined } }, { status: 500 });
  }
}
