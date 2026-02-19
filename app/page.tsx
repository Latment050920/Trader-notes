'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { computeTotalR } from '@/lib/metrics';

type Summary = {
  all: { total: number; winRate: number; totalR: number; avgR: number };
  byAsset: Array<{ key: string; count: number; totalR: number }>;
  bySide: Array<{ key: string; count: number; totalR: number }>;
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rDistribution, setRDistribution] = useState<Array<{ id: string; symbol: string; r: number }>>([]);

  useEffect(() => {
    fetch('/api/dashboard/summary').then((r) => r.json()).then(setSummary);
    fetch('/api/trades')
      .then((r) => r.json())
      .then((rows) => setRDistribution(rows.map((t: any) => ({ id: t.id, symbol: t.symbol, r: computeTotalR(t) ?? 0 }))));
  }, []);

  if (!summary) return <div className="card p-4">Loading...</div>;

  return <div className="space-y-5">
    <section className="grid gap-3 md:grid-cols-4">
      <div className="card p-4"><p className="text-sm text-slate-500">Total Trades</p><p className="mt-2 text-2xl font-semibold">{summary.all.total}</p></div>
      <div className="card p-4"><p className="text-sm text-slate-500">Win Rate</p><p className="mt-2 text-2xl font-semibold">{summary.all.winRate.toFixed(1)}%</p></div>
      <div className="card p-4"><p className="text-sm text-slate-500">Total R</p><p className="mt-2 text-2xl font-semibold">{summary.all.totalR.toFixed(2)}</p></div>
      <div className="card p-4"><p className="text-sm text-slate-500">Avg R</p><p className="mt-2 text-2xl font-semibold">{summary.all.avgR.toFixed(2)}</p></div>
    </section>

    <section className="grid gap-4 md:grid-cols-2">
      <div className="card p-4">
        <h2 className="mb-3 font-medium">AssetClass 表现</h2>
        {summary.byAsset.map((v) => <div key={v.key} className="mb-2 flex justify-between text-sm"><span>{v.key}</span><span>{v.count} trades / {v.totalR.toFixed(2)}R</span></div>)}
      </div>
      <div className="card p-4">
        <h2 className="mb-3 font-medium">Long / Short 对比</h2>
        {summary.bySide.map((v) => <div key={v.key} className="mb-2 flex justify-between text-sm"><span>{v.key}</span><span>{v.count} trades / {v.totalR.toFixed(2)}R</span></div>)}
      </div>
    </section>

    <section className="card p-4">
      <h2 className="mb-3 font-medium">R Distribution</h2>
      <div className="flex flex-wrap gap-2">{rDistribution.map((t)=> <span key={t.id} className={`rounded-lg px-2 py-1 text-xs ${t.r>=0?'bg-emerald-100':'bg-rose-100'}`}>{t.symbol} {t.r.toFixed(2)}</span>)}</div>
    </section>

    <Link href="/trades" className="btn-primary inline-block">查看交易列表</Link>
  </div>;
}
