import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json(
      {
        ok: true,
        data: {
          summary: `已分析 ${body?.trade?.symbol || '该'} 订单，建议优化风控。`,
          disciplineScore: 78,
          errorCategories: ['过早止盈', '仓位控制偏激进'],
          actionChecklist: ['进场前写下无效条件', '固定最大单笔风险', '复盘前先回看计划'],
        },
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: {
          message,
          code: (err as any)?.code,
          hint: (err as any)?.hint,
          name: (err as any)?.name,
          stack: process.env.NODE_ENV !== 'production' ? (err as any)?.stack : undefined,
        },
      },
      { status: 500 },
    );
  }
}
