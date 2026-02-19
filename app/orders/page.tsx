'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchJson } from '@/lib/utils/fetchJson';
import { MotionLayout } from '@/components/ui/MotionLayout';
import { GlassCard } from '@/components/ui/GlassCard';

type Order = any;

export default function OrdersPage() {
  const [rows, setRows] = useState<Order[]>([]);
  const [symbol, setSymbol] = useState('');
  const [status, setStatus] = useState('全部');
  const [side, setSide] = useState('全部');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => { fetchJson<Order[]>('/api/orders').then(setRows).catch(() => setRows([])); }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    if (symbol && !String(r.symbol).toLowerCase().includes(symbol.toLowerCase())) return false;
    if (status !== '全部' && r.status !== status) return false;
    if (side !== '全部' && r.side !== side) return false;
    const t = String(r.parsedUpdatedAt || r.updatedAtText || '').slice(0, 10);
    if (from && t < from) return false;
    if (to && t > to) return false;
    return true;
  }), [rows, symbol, status, side, from, to]);

  return <MotionLayout><div className="space-y-4">
    <GlassCard className="grid gap-2 p-4 md:grid-cols-5">
      <input className="input" placeholder="symbol" value={symbol} onChange={(e)=>setSymbol(e.target.value)} />
      <select className="input" value={status} onChange={(e)=>setStatus(e.target.value)}><option>全部</option><option>已成交</option><option>已取消</option></select>
      <select className="input" value={side} onChange={(e)=>setSide(e.target.value)}><option>全部</option><option>买入</option><option>卖出</option></select>
      <input className="input" type="date" value={from} onChange={(e)=>setFrom(e.target.value)} />
      <input className="input" type="date" value={to} onChange={(e)=>setTo(e.target.value)} />
    </GlassCard>

    <div className="hidden md:block glass-card overflow-auto p-2">
      <table className="min-w-full text-sm">
        <thead><tr><th className="p-2">symbol</th><th>side</th><th>type</th><th>volume</th><th>filled</th><th>avg</th><th>sl</th><th>limit</th><th>status</th><th>updatedAt</th><th>profit</th><th>swap</th><th>commission</th><th>orderId</th></tr></thead>
        <tbody>{filtered.map((r)=> <tr key={r.id} className="border-t border-border/40"><td className="p-2">{r.symbol}</td><td>{r.side}</td><td>{r.orderType}</td><td>{r.volume ?? '-'}</td><td>{r.filledVolume ?? '-'}</td><td>{r.avgFillPrice ?? '-'}</td><td>{r.stopLossPrice ?? '-'}</td><td>{r.limitPrice ?? '-'}</td><td>{r.status}</td><td>{r.updatedAtText}</td><td>{r.profit ?? '-'}</td><td>{r.swap ?? '-'}</td><td>{r.commission ?? '-'}</td><td>{r.orderId}</td></tr>)}</tbody>
      </table>
    </div>

    <div className="grid gap-3 md:hidden">{filtered.map((r)=><GlassCard key={r.id} className="p-3 text-sm"><div className="flex justify-between"><span>{r.symbol}</span><span>{r.side}</span></div><p>{r.status} · {r.orderType}</p><p>Profit: {r.profit ?? '-'}</p><p>{r.orderId}</p></GlassCard>)}</div>
  </div></MotionLayout>;
}
