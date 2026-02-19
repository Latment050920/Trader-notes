'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AreaChart, Lightbulb, PieChart, TrendingUp } from 'lucide-react';
import { computeTotalR } from '@/lib/metrics';
import { MotionLayout } from '@/components/ui/MotionLayout';
import { StatCard } from '@/components/ui/StatCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { SkeletonCard } from '@/components/ui/Skeletons';

type Summary = {
  all: { total: number; winRate: number; totalR: number; avgR: number };
  byAsset: Array<{ key: string; count: number; totalR: number }>;
  bySide: Array<{ key: string; count: number; totalR: number }>;
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [view, setView] = useState<'distribution' | 'asset'>('distribution');

  useEffect(() => {
    fetch('/api/dashboard/summary').then((r) => r.json()).then(setSummary);
    fetch('/api/trades').then((r) => r.json()).then(setTrades);
  }, []);

  const insights = useMemo(() => {
    if (!trades.length) return [];
    const tagCount: Record<string, number> = {};
    const assetPerf: Record<string, number> = {};
    trades.forEach((t) => {
      (t.tags || []).forEach((tag: string) => (tagCount[tag] = (tagCount[tag] || 0) + 1));
      assetPerf[t.assetClass] = (assetPerf[t.assetClass] || 0) + (computeTotalR(t) || 0);
    });
    const topTag = Object.entries(tagCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const bestAsset = Object.entries(assetPerf).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const longAvg = trades.filter((t) => t.side === 'Long').reduce((acc, t) => acc + (computeTotalR(t) || 0), 0);
    const shortAvg = trades.filter((t) => t.side === 'Short').reduce((acc, t) => acc + (computeTotalR(t) || 0), 0);
    return [
      `最常见标签：${topTag}`,
      `Long/Short 稳定性：${longAvg >= shortAvg ? 'Long 更优' : 'Short 更优'}`,
      `本周表现最强资产：${bestAsset}`,
    ];
  }, [trades]);

  if (!summary) {
    return <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>;
  }

  return (
    <MotionLayout>
      <div className="space-y-5">
        <section className="grid gap-3 md:grid-cols-5">
          <StatCard title="Total R" value={summary.all.totalR.toFixed(2)} numeric />
          <StatCard title="Win Rate" value={`${summary.all.winRate.toFixed(1)}%`} numeric />
          <StatCard title="Avg R" value={summary.all.avgR.toFixed(2)} numeric />
          <StatCard title="Trades" value={`${summary.all.total}`} numeric />
          <StatCard title="Profit Factor" value={(Math.max(summary.all.totalR, 0.01) / Math.max(1, summary.all.total - summary.all.winRate / 100)).toFixed(2)} numeric />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <GlassCard className="p-4 lg:col-span-2">
            <div className="mb-3 flex items-center gap-2"><AreaChart className="h-4 w-4 text-cyan-300" /><h3 className="font-semibold">Equity Curve (R 累积)</h3></div>
            <div className="space-y-2">
              {trades.slice(-8).map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-white/5 px-3 py-2 text-sm">
                  <span>{t.symbol}</span><span className="tabular-nums">{(computeTotalR(t) ?? 0).toFixed(2)}R</span>
                </div>
              ))}
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Performance</h3>
              <div className="inline-flex gap-1">
                <button className="btn-secondary px-2 py-1" onClick={() => setView('distribution')}><PieChart className="h-4 w-4" /></button>
                <button className="btn-secondary px-2 py-1" onClick={() => setView('asset')}><TrendingUp className="h-4 w-4" /></button>
              </div>
            </div>
            {view === 'distribution' ? (
              <div className="flex flex-wrap gap-2">{trades.map((t)=>{const r=computeTotalR(t)||0;return <span key={t.id} className={`rounded-lg px-2 py-1 text-xs ${r>=0?'bg-emerald-500/20':'bg-rose-500/20'}`}>{t.symbol} {r.toFixed(2)}</span>})}</div>
            ) : (
              <div className="space-y-2">{summary.byAsset.map((v) => <div key={v.key} className="flex justify-between text-sm"><span>{v.key}</span><span>{v.totalR.toFixed(2)}R</span></div>)}</div>
            )}
          </GlassCard>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <GlassCard className="p-4 lg:col-span-2">
            <h3 className="mb-3 font-semibold">最近交易</h3>
            <div className="space-y-2">
              {trades.length === 0 ? <p className="text-sm text-muted">暂无交易，先去新增一笔 Demo 交易。</p> : trades.slice(0, 6).map((t) => (
                <Link href={`/trades/${t.id}`} key={t.id} className="block rounded-xl border border-border/60 bg-white/5 px-3 py-2 text-sm hover:border-cyan-400/50 hover:bg-white/10">
                  <div className="flex items-center justify-between"><span>{t.assetClass} · {t.symbol}</span><span>{t.side}</span></div>
                </Link>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="mb-3 flex items-center gap-2"><Lightbulb className="h-4 w-4 text-cyan-300" /><h3 className="font-semibold">Insights</h3></div>
            <ul className="space-y-2 text-sm text-muted">{insights.map((i) => <li key={i}>• {i}</li>)}</ul>
          </GlassCard>
        </section>
      </div>
    </MotionLayout>
  );
}
