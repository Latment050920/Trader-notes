import { NextRequest, NextResponse } from 'next/server';
import { deleteTrade, getTrade, updateTrade } from '@/lib/db';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trade = getTrade(Number(id));
  if (!trade) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(trade);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await req.json();
  const trade = updateTrade(Number(id), payload);
  return NextResponse.json(trade);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteTrade(Number(id));
  return NextResponse.json({ ok: true });
}
