import Link from 'next/link';
import { listTrades } from '@/lib/db';
import { aggregate, computeTotalR } from '@/lib/metrics';
import { StatCard } from '@/components/StatCard';

export default function DashboardPage() {
  const trades = listTrades();
  const stats = aggregate(trades);
  const byAsset = Object.entries(trades.reduce((acc: any, t) => {
    acc[t.assetClass] = acc[t.assetClass] || { count: 0, totalR: 0 };
    acc[t.assetClass].count += 1;
    acc[t.assetClass].totalR += computeTotalR(t) || 0;
    return acc;
  }, {}));
  const bySide = Object.entries(trades.reduce((acc: any, t) => {
    acc[t.side] = acc[t.side] || { count: 0, totalR: 0 };
    acc[t.side].count += 1;
    acc[t.side].totalR += computeTotalR(t) || 0;
    return acc;
  }, {}));

  return <div className="space-y-5">
    <section className="grid gap-3 md:grid-cols-4">
      <StatCard title="Total Trades" value={String(stats.total)} />
      <StatCard title="Win Rate" value={`${stats.winRate.toFixed(1)}%`} />
      <StatCard title="Total R" value={stats.totalR.toFixed(2)} />
      <StatCard title="Avg R" value={stats.avgR.toFixed(2)} />
    </section>

    <section className="grid gap-4 md:grid-cols-2">
      <div className="card p-4">
        <h2 className="mb-3 font-medium">AssetClass 表现</h2>
        {byAsset.map(([k, v]: any) => <div key={k} className="mb-2 flex justify-between text-sm"><span>{k}</span><span>{v.count} trades / {v.totalR.toFixed(2)}R</span></div>)}
      </div>
      <div className="card p-4">
        <h2 className="mb-3 font-medium">Long / Short 对比</h2>
        {bySide.map(([k, v]: any) => <div key={k} className="mb-2 flex justify-between text-sm"><span>{k}</span><span>{v.count} trades / {v.totalR.toFixed(2)}R</span></div>)}
      </div>
    </section>

    <section className="card p-4">
      <h2 className="mb-3 font-medium">R Distribution</h2>
      <div className="flex flex-wrap gap-2">{trades.map((t)=>{const r=computeTotalR(t)||0; return <span key={t.id} className={`rounded-lg px-2 py-1 text-xs ${r>=0?'bg-emerald-100':'bg-rose-100'}`}>{t.symbol} {r.toFixed(2)}R</span>})}</div>
    </section>

    <Link href="/trades" className="btn-primary inline-block">查看交易列表</Link>
  </div>;
}
