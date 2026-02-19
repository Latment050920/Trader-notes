import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  return NextResponse.json({
    summary: `已分析 ${body?.trade?.symbol || '该'} 交易，建议提升止损执行一致性。`,
    disciplineScore: 78,
    errorCategories: ['过早止盈', '仓位控制偏激进'],
    actionChecklist: ['进场前写下无效条件', '固定最大单笔风险', '复盘前先回看计划'],
  });
}
