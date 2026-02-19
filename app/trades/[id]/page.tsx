'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { marked } from 'marked';
import { computeMfeMae, computeTotalR, holdDuration, outcomeLabel } from '@/lib/metrics';
import { PriceChart } from '@/charts/PriceChart';
import { TradeActions } from '@/components/TradeActions';

export default function TradeDetailPage() {
  const params = useParams<{ id: string }>();
  const [trade, setTrade] = useState<any | null>(null);

  useEffect(() => {
    fetch(`/api/trades/${params.id}`).then((r) => r.json()).then(setTrade);
  }, [params.id]);

  if (!trade) return <div className="card p-4">Loading...</div>;
  const r = computeTotalR(trade);
  const { mfe, mae } = computeMfeMae(trade, trade.priceSeries || []);

  return <div className="space-y-4">
    <TradeActions id={trade.id} />
    <PriceChart trade={trade} />
    <section className="grid gap-3 md:grid-cols-4">
      <div className="card p-3"><p className="text-xs text-slate-500">R</p><p className="text-xl font-semibold">{r == null ? 'N/A' : r.toFixed(2)}</p></div>
      <div className="card p-3"><p className="text-xs text-slate-500">MFE/MAE</p><p className="text-xl font-semibold">{mfe == null ? 'N/A' : `${mfe.toFixed(2)} / ${mae?.toFixed(2)}`}</p></div>
      <div className="card p-3"><p className="text-xs text-slate-500">Duration</p><p className="text-xl font-semibold">{holdDuration(trade.entryTime, trade.closeTime)}</p></div>
      <div className="card p-3"><p className="text-xs text-slate-500">Status</p><p className="text-xl font-semibold">{outcomeLabel(trade)}</p></div>
    </section>
    <section className="card p-4"><h3 className="mb-2 font-medium">Asset Extra</h3><pre className="overflow-auto rounded bg-slate-50 p-3 text-xs">{JSON.stringify(trade.extra, null, 2)}</pre></section>
    <section className="card p-4"><h3 className="mb-2 font-medium">Notes</h3><article className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: marked.parse(trade.notes || '') }} /></section>
  </div>;
}
