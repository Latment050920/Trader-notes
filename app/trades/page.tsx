'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { computeTotalR } from '@/lib/metrics';
import { MotionLayout } from '@/components/ui/MotionLayout';
import { Segmented } from '@/components/ui/Segmented';
import { GlassCard } from '@/components/ui/GlassCard';
import { SkeletonTable } from '@/components/ui/Skeletons';

const classes = ['All', 'Stock', 'CFD', 'Futures', 'Fund', 'Options'];

export default function TradesPage() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [q, setQ] = useState('');
  const [assetClass, setAssetClass] = useState('All');
  const [side, setSide] = useState<'All' | 'Long' | 'Short'>('All');

  useEffect(() => {
    fetch('/api/trades').then((r) => r.json()).then(setRows);
  }, []);

  const trades = useMemo(() => (rows || []).filter((t) => {
    const hitQ = !q || [t.symbol, t.notes || '', ...(t.tags || [])].join(' ').toLowerCase().includes(q.toLowerCase());
    const hitAsset = assetClass === 'All' || t.assetClass === assetClass;
    const hitSide = side === 'All' || t.side === side;
    return hitQ && hitAsset && hitSide;
  }), [rows, q, assetClass, side]);

  if (!rows) return <SkeletonTable />;

  return (
    <MotionLayout>
      <div className="space-y-4">
        <GlassCard className="space-y-3 p-4">
          <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" /><input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索 symbol / tags / notes" /></div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <Segmented options={classes} value={assetClass} onChange={setAssetClass} />
            <Segmented options={['All', 'Long', 'Short']} value={side} onChange={(v)=>setSide(v as any)} />
          </div>
        </GlassCard>

        <div className="hidden md:block">
          <GlassCard className="overflow-auto p-2">
            <table className="min-w-full text-sm">
              <thead className="text-left text-muted"><tr><th className="p-3">Time</th><th>Asset</th><th>Symbol</th><th>Side</th><th>R</th><th>Tags</th><th /></tr></thead>
              <tbody>
                {trades.map((t) => (
                  <motion.tr layout key={t.id} className="rounded-xl border-t border-border/50 hover:bg-white/5">
                    <td className="p-3">{t.entryTime}</td><td>{t.assetClass}</td><td>{t.symbol}</td><td>{t.side}</td><td>{(computeTotalR(t) ?? NaN).toFixed?.(2) || 'N/A'}</td><td>{(t.tags || []).join(', ')}</td><td><Link className="btn-secondary" href={`/trades/${t.id}`}>Detail</Link></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        </div>

        <div className="grid gap-3 md:hidden">
          {trades.map((t) => (
            <GlassCard key={t.id} className="p-3">
              <div className="flex justify-between text-sm"><span>{t.assetClass} · {t.symbol}</span><span>{t.side}</span></div>
              <p className="mt-2 text-xs text-muted">{t.entryTime}</p>
              <div className="mt-3"><Link className="btn-secondary" href={`/trades/${t.id}`}>Open</Link></div>
            </GlassCard>
          ))}
        </div>
      </div>
    </MotionLayout>
  );
}
