import { NextRequest, NextResponse } from 'next/server';
import { createTrade, listTrades } from '@/lib/db';

export async function GET() {
  return NextResponse.json(listTrades());
}

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const trade = createTrade(payload);
  return NextResponse.json(trade, { status: 201 });
}
