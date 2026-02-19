'use client';

import { useEffect, useMemo, useState } from 'react';
import { MotionLayout } from '@/components/ui/MotionLayout';
import { StatCard } from '@/components/ui/StatCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { fetchJson } from '@/lib/utils/fetchJson';

type MetricsResp = {
  ok: boolean;
  settings: { initialEquity: number; riskFreeRateAnnual: number; tradingDaysPerYear: number };
  metrics: {
    sharpe: number | null;
    sortino: number | null;
    maxDD: number;
    maxDDPct: number;
    cagr: number | null;
    calmar: number | null;
    profitFactor: number | null;
    expectancy: number | null;
    maxConsecutiveLosses?: number;
    maxConsecutiveWins?: number;
    sampleNote?: string;
  };
  series: { equityDaily: Array<{ date: string; equityStart: number; equityEnd: number; dailyNetPnL: number; dailyCashflow: number; return: number | null }> };
  summary: {
    totalOrders: number;
    filledOrders: number;
    totalProfit: number;
    totalSwap: number;
    totalCommission: number;
    topSymbolsByProfit: Array<{ symbol: string; profit: number }>;
  };
  meta: { winDefinition: string; returnDefinition: string };
};

type Cashflow = { id: string; dateTime: string; amount: number; note?: string };

export default function DashboardPage() {
  const [data, setData] = useState<MetricsResp | null>(null);
  const [cashflows, setCashflows] = useState<Cashflow[]>([]);
  const [openForm, setOpenForm] = useState<'入金' | '出金' | null>(null);
  const [amount, setAmount] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [note, setNote] = useState('');

  const load = () => {
    fetchJson<MetricsResp>('/api/dashboard/metrics').then(setData).catch((e) => {
      console.log('dashboard error', e);
      setData(null);
    });
    fetchJson<{ ok: boolean; items: Cashflow[] }>('/api/cashflows').then((r) => setCashflows(r.items || [])).catch(() => setCashflows([]));
  };

  useEffect(() => {
    load();
  }, []);

  const saveSettings = async (patch: any) => {
    if (!data) return;
    const payload = { ...data.settings, ...patch };
    await fetchJson('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    load();
  };

  const submitCashflow = async () => {
    if (!openForm) return;
    const val = Number(amount);
    if (!Number.isFinite(val) || val <= 0) return;
    const signed = openForm === '入金' ? val : -val;
    await fetchJson('/api/cashflows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: signed, dateTime: dateTime || new Date().toISOString(), note }) });
    setOpenForm(null);
    setAmount('');
    setDateTime('');
    setNote('');
    load();
  };

  const removeCashflow = async (id: string) => {
    await fetchJson(`/api/cashflows?id=${id}`, { method: 'DELETE' });
    load();
  };

  const metricsCards = useMemo(() => {
    if (!data) return [];
    return [
      ['夏普比率（Sharpe）', fmtRatio(data.metrics.sharpe)],
      ['索提诺比率（Sortino）', fmtRatio(data.metrics.sortino)],
      ['最大回撤（金额）', fmtAmt(data.metrics.maxDD)],
      ['最大回撤（比例）', fmtPct(data.metrics.maxDDPct)],
      ['年化收益率（CAGR）', fmtPct(data.metrics.cagr)],
      ['卡玛比率（Calmar）', fmtRatio(data.metrics.calmar)],
      ['盈利因子（Profit Factor）', data.metrics.profitFactor == null ? '∞/不可用' : data.metrics.profitFactor.toFixed(2)],
      ['期望值（Expectancy）', fmtAmt(data.metrics.expectancy)],
      ['最大连亏（笔）', String(data.metrics.maxConsecutiveLosses ?? 0)],
      ['最大连胜（笔）', String(data.metrics.maxConsecutiveWins ?? 0)],
    ];
  }, [data]);

  if (!data) return <div className="glass-card p-4">加载中...</div>;

  return <MotionLayout><div className="space-y-4">
    <section className="grid gap-3 md:grid-cols-4">
      <StatCard title="总订单数" value={String(data.summary.totalOrders)} numeric />
      <StatCard title="已成交订单数" value={String(data.summary.filledOrders)} numeric />
      <StatCard title="净收益合计（Profit+Swap-Commission）" value={fmtNum(data.summary.totalProfit)} numeric />
      <StatCard title="总手续费（Commission）" value={fmtNum(data.summary.totalCommission)} numeric />
    </section>

    <GlassCard className="space-y-3 p-4">
      <h3 className="font-semibold">账户参数</h3>
      <div className="grid gap-2 md:grid-cols-3">
        <label className="text-sm">初始本金
          <input className="input mt-1" value={String(data.settings.initialEquity)} onChange={(e)=>setData((d)=>d?{...d,settings:{...d.settings,initialEquity:Number(e.target.value||0)}}:d)} onBlur={()=>saveSettings({ initialEquity: data.settings.initialEquity })} />
        </label>
        <label className="text-sm">年化无风险利率（%）
          <input className="input mt-1" value={String(data.settings.riskFreeRateAnnual)} onChange={(e)=>setData((d)=>d?{...d,settings:{...d.settings,riskFreeRateAnnual:Number(e.target.value||0)}}:d)} onBlur={()=>saveSettings({ riskFreeRateAnnual: data.settings.riskFreeRateAnnual })} />
        </label>
        <label className="text-sm">年化交易日数
          <input className="input mt-1" value={String(data.settings.tradingDaysPerYear)} onChange={(e)=>setData((d)=>d?{...d,settings:{...d.settings,tradingDaysPerYear:Number(e.target.value||252)}}:d)} onBlur={()=>saveSettings({ tradingDaysPerYear: data.settings.tradingDaysPerYear })} />
        </label>
      </div>
      <div className="flex gap-2">
        <button className="btn-secondary" onClick={()=>setOpenForm('入金')}>入金</button>
        <button className="btn-secondary" onClick={()=>setOpenForm('出金')}>出金</button>
      </div>
      {openForm ? <div className="grid gap-2 rounded-xl border border-border/50 p-3 md:grid-cols-4">
        <input className="input" placeholder="金额（正数）" value={amount} onChange={(e)=>setAmount(e.target.value)} />
        <input className="input" type="datetime-local" value={dateTime} onChange={(e)=>setDateTime(e.target.value)} />
        <input className="input" placeholder="备注" value={note} onChange={(e)=>setNote(e.target.value)} />
        <div className="flex gap-2"><button className="btn-primary" onClick={submitCashflow}>确认{openForm}</button><button className="btn-secondary" onClick={()=>setOpenForm(null)}>取消</button></div>
      </div> : null}
      <details>
        <summary className="cursor-pointer text-sm">最近资金流水</summary>
        <div className="mt-2 overflow-auto">
          <table className="min-w-full text-sm"><thead><tr><th className="p-2 text-left">发生时间</th><th className="text-left">类型</th><th className="text-left">金额</th><th className="text-left">备注</th><th className="text-left">操作</th></tr></thead><tbody>{cashflows.map((c)=><tr key={c.id} className="border-t border-border/40"><td className="p-2">{String(c.dateTime).replace('T',' ').slice(0,16)}</td><td>{c.amount>=0?'入金':'出金'}</td><td>{fmtNum(c.amount)}</td><td>{c.note || '-'}</td><td><button className="btn-secondary" onClick={()=>removeCashflow(c.id)}>删除</button></td></tr>)}</tbody></table>
        </div>
      </details>
    </GlassCard>

    <section className="grid gap-3 md:grid-cols-2">
      {metricsCards.map(([k,v])=><StatCard key={k} title={k} value={v} />)}
    </section>

    <GlassCard className="p-4">
      <h3 className="mb-2 font-semibold">权益曲线（日度）</h3>
      <div className="space-y-1 text-xs">{data.series.equityDaily.slice(-20).map((d)=> <div key={d.date} className="flex justify-between"><span>{d.date}</span><span>期初 {fmtNum(d.equityStart)} → 期末 {fmtNum(d.equityEnd)}｜净收益 {fmtNum(d.dailyNetPnL)}｜资金变动 {fmtNum(d.dailyCashflow)}｜收益率 {d.return==null?'N/A':fmtPct(d.return)}</span></div>)}</div>
    </GlassCard>

    <GlassCard className="p-4 text-sm text-muted">
      <p>{data.meta.winDefinition}</p>
      <p>{data.meta.returnDefinition}</p>
      {data.metrics.sampleNote ? <p>{data.metrics.sampleNote}</p> : null}
    </GlassCard>
  </div></MotionLayout>;
}

function fmtNum(v: number | null | undefined) { return Number(v || 0).toFixed(2); }
function fmtAmt(v: number | null | undefined) { return v == null ? '不可用' : Number(v).toFixed(2); }
function fmtRatio(v: number | null | undefined) { return v == null ? '不可用（样本不足）' : Number(v).toFixed(2); }
function fmtPct(v: number | null | undefined) { return v == null ? '不可用' : `${(Number(v) * 100).toFixed(2)}%`; }
