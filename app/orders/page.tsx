'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchJson } from '@/lib/utils/fetchJson';
import { MotionLayout } from '@/components/ui/MotionLayout';
import { GlassCard } from '@/components/ui/GlassCard';

type Order = any;

function fmtNum(v: number) {
  return Number(v || 0).toFixed(2);
}

export default function OrdersPage() {
  const [rows, setRows] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [symbol, setSymbol] = useState('');
  const [status, setStatus] = useState('全部');
  const [side, setSide] = useState('全部');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<'updatedAtDesc' | 'profitDesc'>('updatedAtDesc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (symbol) sp.set('q', symbol);
    if (status !== '全部') sp.set('status', status);
    if (side !== '全部') sp.set('side', side);
    if (from) sp.set('start', from);
    if (to) sp.set('end', to);
    sp.set('sort', sort);
    sp.set('page', String(page));
    sp.set('pageSize', String(pageSize));
    return sp.toString();
  }, [symbol, status, side, from, to, sort, page]);

  useEffect(() => {
    fetchJson<{ ok: boolean; items: Order[]; total: number }>(`/api/orders?${query}`)
      .then((res) => {
        setRows(res.items || []);
        setTotal(res.total || 0);
      })
      .catch((e) => {
        console.log('orders error', e);
        setRows([]);
        setTotal(0);
      });
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return <MotionLayout><div className="space-y-4">
    <GlassCard className="grid gap-2 p-4 md:grid-cols-6">
      <input className="input" placeholder="商品代码/订单编号" value={symbol} onChange={(e)=>{setPage(1);setSymbol(e.target.value);}} />
      <select className="input" value={status} onChange={(e)=>{setPage(1);setStatus(e.target.value);}}><option>全部</option><option>已成交</option><option>已取消</option></select>
      <select className="input" value={side} onChange={(e)=>{setPage(1);setSide(e.target.value);}}><option>全部</option><option>买入</option><option>卖出</option></select>
      <input className="input" type="date" value={from} onChange={(e)=>{setPage(1);setFrom(e.target.value);}} />
      <input className="input" type="date" value={to} onChange={(e)=>{setPage(1);setTo(e.target.value);}} />
      <select className="input" value={sort} onChange={(e)=>setSort(e.target.value as any)}><option value="updatedAtDesc">按更新时间</option><option value="profitDesc">按Profit</option></select>
    </GlassCard>

    <div className="hidden md:block glass-card overflow-auto p-2">
      <table className="min-w-full text-sm">
        <thead><tr><th className="p-2">商品代码</th><th>方向（买/卖）</th><th>类型</th><th>数量</th><th>已成交数量</th><th>成交均价</th><th>止损价</th><th>限价</th><th>状态</th><th>更新时间</th><th>净收益</th><th>Profit</th><th>Swap</th><th>Commission</th><th>订单编号</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border/40">
              <td className="p-2">{r.symbol}</td>
              <td>{r.side}</td>
              <td>{r.orderType}</td>
              <td>{r.volume ?? '-'}</td>
              <td>{r.filledVolume ?? '-'}</td>
              <td>{r.avgFillPrice ?? '-'}</td>
              <td>{r.stopLossPrice ?? '-'}</td>
              <td>{r.limitPrice ?? '-'}</td>
              <td>{r.status}</td>
              <td>{r.updatedAtText}</td>
              <td>{fmtNum((r.profit || 0) + (r.swap || 0) - (r.commission || 0))}</td>
              <td>{r.profit ?? '-'}</td>
              <td>{r.swap ?? '-'}</td>
              <td>{r.commission ?? '-'}</td>
              <td>{r.orderId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="grid gap-3 md:hidden">{rows.map((r)=><GlassCard key={r.id} className="p-3 text-sm"><div className="flex justify-between"><span>{r.symbol}</span><span>{r.side}</span></div><p>{r.status} · {r.orderType}</p><p>净收益: {fmtNum((r.profit || 0) + (r.swap || 0) - (r.commission || 0))}</p><p>{r.orderId}</p></GlassCard>)}</div>

    <GlassCard className="flex items-center justify-between p-3 text-sm">
      <span>共 {total} 条，当前第 {page}/{totalPages} 页</span>
      <div className="flex gap-2">
        <button className="btn-secondary" disabled={page<=1} onClick={()=>setPage((p)=>Math.max(1,p-1))}>上一页</button>
        <button className="btn-secondary" disabled={page>=totalPages} onClick={()=>setPage((p)=>Math.min(totalPages,p+1))}>下一页</button>
      </div>
    </GlassCard>
  </div></MotionLayout>;
}
