'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { marked } from 'marked';
import { motion } from 'framer-motion';
import { BadgeDollarSign } from 'lucide-react';
import { computeMfeMae, computeTotalR, holdDuration, outcomeLabel } from '@/lib/metrics';
import { PriceChart } from '@/charts/PriceChart';
import { TradeActions } from '@/components/TradeActions';
import { MotionLayout } from '@/components/ui/MotionLayout';
import { GlassCard } from '@/components/ui/GlassCard';

export default function TradeDetailPage() {
  const params = useParams<{ id: string }>();
  const [trade, setTrade] = useState<any | null>(null);

  useEffect(() => {
    fetch(`/api/trades/${params.id}`).then((r) => r.json()).then(setTrade);
  }, [params.id]);

  if (!trade) return <GlassCard className="p-4">Loading...</GlassCard>;
  const r = computeTotalR(trade);
  const { mfe, mae } = computeMfeMae(trade, trade.priceSeries || []);

  const metrics = [
    ['R', r == null ? 'N/A' : r.toFixed(2)],
    ['MFE/MAE', mfe == null ? 'N/A' : `${mfe.toFixed(2)} / ${mae?.toFixed(2)}`],
    ['Duration', holdDuration(trade.entryTime, trade.closeTime)],
    ['Status', outcomeLabel(trade)],
  ];

  return <MotionLayout>
    <div className="space-y-4">
      <GlassCard className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3 text-sm"><BadgeDollarSign className="h-5 w-5 text-cyan-300" />
          <span className="rounded-lg border border-border/70 px-2 py-1">{trade.assetClass}</span>
          <span className="font-semibold">{trade.symbol}</span>
          <span>{trade.side}</span>
          <span className="tabular-nums">{r == null ? 'N/A' : `${r.toFixed(2)}R`}</span>
        </div>
        <TradeActions id={trade.id} />
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-10">
        <GlassCard className="p-3 lg:col-span-7"><PriceChart trade={trade} /></GlassCard>
        <div className="space-y-3 lg:col-span-3">
          {metrics.map(([k, v], idx) => (
            <motion.div key={k} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
              <GlassCard className="p-3"><p className="text-xs text-muted">{k}</p><p className="text-xl font-semibold">{v}</p></GlassCard>
            </motion.div>
          ))}
        </div>
      </div>

      <GlassCard className="p-4"><h3 className="mb-2 font-medium">Asset Extra</h3><pre className="overflow-auto rounded-xl bg-white/5 p-3 text-xs">{JSON.stringify(trade.extra, null, 2)}</pre></GlassCard>
      <GlassCard className="p-4"><h3 className="mb-2 font-medium">Notes</h3><article className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: marked.parse(trade.notes || '') }} /></GlassCard>
    </div>
  </MotionLayout>;
}
