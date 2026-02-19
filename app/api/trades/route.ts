import { NextRequest, NextResponse } from 'next/server';
import { createTrade, listTrades } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(await listTrades());
}

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const trade = await createTrade(payload);
  return NextResponse.json(trade, { status: 201 });
}
