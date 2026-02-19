import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  return NextResponse.json({
    message: 'v1.1 placeholder',
    receivedRows: body?.rows?.length || 0,
    mappingHint: ['assetClass', 'symbol', 'entryTime', 'entryPrice', 'stopLoss', 'extra.*'],
  });
}
