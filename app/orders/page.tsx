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

  useEffect(() => {
    fetchJson<{ ok: boolean; data: Order[] }>('/api/orders')
      .then((res) => setRows(res.data || []))
      .catch((e) => {
        console.log('orders error', e);
        setRows([]);
      });
  }, []);

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
      <input className="input" placeholder="商品代码" value={symbol} onChange={(e)=>setSymbol(e.target.value)} />
      <select className="input" value={status} onChange={(e)=>setStatus(e.target.value)}><option>全部</option><option>已成交</option><option>已取消</option></select>
      <select className="input" value={side} onChange={(e)=>setSide(e.target.value)}><option>全部</option><option>买入</option><option>卖出</option></select>
      <input className="input" type="date" value={from} onChange={(e)=>setFrom(e.target.value)} />
      <input className="input" type="date" value={to} onChange={(e)=>setTo(e.target.value)} />
    </GlassCard>

    <div className="hidden md:block glass-card overflow-auto p-2">
      <table className="min-w-full text-sm">
        <thead><tr><th className="p-2">商品代码</th><th>买/卖</th><th>类型</th><th>数量</th><th>已成交</th><th>成交均价</th><th>止损价</th><th>限价</th><th>状态</th><th>更新时间</th><th>Profit</th><th>Swap</th><th>Commission</th><th>订单编号</th></tr></thead>
        <tbody>{filtered.map((r)=> <tr key={r.id} className="border-t border-border/40"><td className="p-2">{r.symbol}</td><td>{r.side}</td><td>{r.orderType}</td><td>{r.volume ?? '-'}</td><td>{r.filledVolume ?? '-'}</td><td>{r.avgFillPrice ?? '-'}</td><td>{r.stopLossPrice ?? '-'}</td><td>{r.limitPrice ?? '-'}</td><td>{r.status}</td><td>{r.updatedAtText}</td><td>{r.profit ?? '-'}</td><td>{r.swap ?? '-'}</td><td>{r.commission ?? '-'}</td><td>{r.orderId}</td></tr>)}</tbody>
      </table>
    </div>

    <div className="grid gap-3 md:hidden">{filtered.map((r)=><GlassCard key={r.id} className="p-3 text-sm"><div className="flex justify-between"><span>{r.symbol}</span><span>{r.side}</span></div><p>{r.status} · {r.orderType}</p><p>Profit: {r.profit ?? '-'}</p><p>{r.orderId}</p></GlassCard>)}</div>
  </div></MotionLayout>;
}
