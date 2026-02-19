'use client';

import { useEffect, useState } from 'react';
import { MotionLayout } from '@/components/ui/MotionLayout';
import { StatCard } from '@/components/ui/StatCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { fetchJson } from '@/lib/utils/fetchJson';

type Summary = {
  totalOrders: number;
  filledOrders: number;
  totalProfit: number;
  winRate: number;
  averageProfit: number;
  totalSwap: number;
  totalCommission: number;
  profitSeries: Array<{ time: string; value: number }>;
  symbolAgg: Array<{ symbol: string; profit: number }>;
  profitBuckets: Array<{ from: number; to: number; count: number }>;
  winRule: string;
};

export default function DashboardPage() {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    fetchJson<Summary>('/api/dashboard/summary').then(setData).catch(() => setData({ totalOrders: 0, filledOrders: 0, totalProfit: 0, winRate: 0, averageProfit: 0, totalSwap: 0, totalCommission: 0, profitSeries: [], symbolAgg: [], profitBuckets: [], winRule: '胜率按已成交且 Profit>0 记胜；Profit<=0 记负。' }));
  }, []);

  if (!data) return <div className="glass-card p-4">Loading...</div>;

  return <MotionLayout><div className="space-y-4">
    <section className="grid gap-3 md:grid-cols-4">
      <StatCard title="总订单数" value={String(data.totalOrders)} numeric />
      <StatCard title="已成交订单数" value={String(data.filledOrders)} numeric />
      <StatCard title="总 Profit" value={data.totalProfit.toFixed(2)} numeric />
      <StatCard title="胜率" value={`${data.winRate.toFixed(1)}%`} numeric />
      <StatCard title="平均 Profit" value={data.averageProfit.toFixed(2)} numeric />
      <StatCard title="总 Swap" value={data.totalSwap.toFixed(2)} numeric />
      <StatCard title="总 Commission" value={data.totalCommission.toFixed(2)} numeric />
    </section>
    <GlassCard className="p-4"><p className="text-sm text-muted">{data.winRule}</p></GlassCard>
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassCard className="p-4"><h3 className="mb-3 font-semibold">Profit 时间序列（累计）</h3>{data.profitSeries.length===0?<p className="text-sm text-muted">暂无数据</p>:data.profitSeries.slice(-20).map((p,i)=><div key={i} className="flex justify-between text-sm"><span>{String(p.time).slice(0,19)}</span><span>{p.value.toFixed(2)}</span></div>)}</GlassCard>
      <GlassCard className="p-4"><h3 className="mb-3 font-semibold">Profit 分布</h3>{data.profitBuckets.length===0?<p className="text-sm text-muted">暂无数据</p>:data.profitBuckets.map((b,i)=><div key={i} className="flex justify-between text-sm"><span>{b.from.toFixed(1)} ~ {b.to.toFixed(1)}</span><span>{b.count}</span></div>)}</GlassCard>
    </div>
    <GlassCard className="p-4"><h3 className="mb-3 font-semibold">Symbol Top Profit</h3>{data.symbolAgg.length===0?<p className="text-sm text-muted">暂无数据</p>:data.symbolAgg.map((s)=><div key={s.symbol} className="flex justify-between text-sm"><span>{s.symbol}</span><span>{s.profit.toFixed(2)}</span></div>)}</GlassCard>
  </div></MotionLayout>;
}
