'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { MotionLayout } from '@/components/ui/MotionLayout';
import { StatCard } from '@/components/ui/StatCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { fetchJson } from '@/lib/utils/fetchJson';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Brush,
} from 'recharts';

type MetricsResp = {
  ok: boolean;
  settings: { initialEquity: number; riskFreeRateAnnual: number; tradingDaysPerYear: number };
  metrics: { sharpe: number | null; sortino: number | null; maxDD: number; maxDDPct: number; cagr: number | null; calmar: number | null; profitFactor: number | null; expectancy: number | null; maxConsecutiveLosses?: number; maxConsecutiveWins?: number; sampleNote?: string };
  summary: { totalOrders: number; filledOrders: number; totalProfit: number; totalSwap: number; totalCommission: number };
  meta: { winDefinition: string; returnDefinition: string };
};

type ChartsResp = {
  ok: boolean;
  kpis: { totalOrders: number; totalProfit: number; avgProfit: number; medianProfit: number | null; stdProfit: number };
  series: {
    equityCurve: Array<{ t: string; v: number }>;
    equityCurveDaily: Array<{ t: string; v: number }>;
    profitPerTrade: Array<{ t: string; v: number; symbol: string }>;
    rollingWinRate: Array<{ t: string; v: number }>;
    rollingAvgProfit: Array<{ t: string; v: number }>;
    rollingStdProfit: Array<{ t: string; v: number }>;
  };
  dist: { profitHistogram: Array<{ bin: string; count: number }> };
  breakdown: { bySymbol: Array<{ key: string; count: number; sumProfit: number; avgProfit: number; winRate: number }> };
  heatmap: { dowHour: Array<{ dow: number; hour: number; count: number; sumProfit: number }> };
};

type Cashflow = { id: string; dateTime: string; amount: number; note?: string };

const rangeMap: Record<string, number> = { '7天': 7, '30天': 30 };

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<MetricsResp | null>(null);
  const [charts, setCharts] = useState<ChartsResp | null>(null);
  const [cashflows, setCashflows] = useState<Cashflow[]>([]);
  const [equityMode, setEquityMode] = useState<'按单' | '按日'>('按单');
  const [status, setStatus] = useState('已成交');
  const [symbol, setSymbol] = useState('ALL');
  const [range, setRange] = useState('全部');
  const [rollingWindow, setRollingWindow] = useState(20);
  const [openForm, setOpenForm] = useState<'入金' | '出金' | null>(null);
  const [amount, setAmount] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [note, setNote] = useState('');
  const reduced = useReducedMotion();

  const dates = useMemo(() => {
    if (range === '全部') return { start: '', end: '' };
    if (range in rangeMap) {
      const end = new Date();
      const start = new Date(Date.now() - rangeMap[range] * 24 * 3600 * 1000);
      return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
    }
    return { start: '', end: '' };
  }, [range]);

  const load = () => {
    const q = new URLSearchParams();
    if (dates.start) q.set('start', dates.start);
    if (dates.end) q.set('end', dates.end);
    if (symbol !== 'ALL') q.set('symbol', symbol);
    if (status !== '全部') q.set('status', status);
    q.set('rollingWindow', String(rollingWindow));
    const qs = q.toString() ? `?${q.toString()}` : '';

    fetchJson<MetricsResp>(`/api/dashboard/metrics${qs}`).then(setMetrics).catch(() => setMetrics(null));
    fetchJson<ChartsResp>(`/api/dashboard/charts${qs}`).then(setCharts).catch(() => setCharts(null));
    fetchJson<{ ok: boolean; items: Cashflow[] }>('/api/cashflows').then((r) => setCashflows(r.items || [])).catch(() => setCashflows([]));
  };

  useEffect(() => { load(); }, [dates.start, dates.end, status, symbol, rollingWindow]);

  const symbols = useMemo(() => ['ALL', ...(new Set(charts?.series.profitPerTrade.map((x) => x.symbol) || []))], [charts]);

  const saveSettings = async (patch: any) => {
    if (!metrics) return;
    await fetchJson('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...metrics.settings, ...patch }) });
    load();
  };

  const submitCashflow = async () => {
    if (!openForm) return;
    const val = Number(amount);
    if (!Number.isFinite(val) || val <= 0) return;
    const signed = openForm === '入金' ? val : -val;
    await fetchJson('/api/cashflows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: signed, dateTime: dateTime || new Date().toISOString(), note }) });
    setOpenForm(null); setAmount(''); setDateTime(''); setNote(''); load();
  };

  const removeCashflow = async (id: string) => { await fetchJson(`/api/cashflows?id=${id}`, { method: 'DELETE' }); load(); };

  const equitySeries = equityMode === '按单' ? charts?.series.equityCurve || [] : charts?.series.equityCurveDaily || [];

  return <MotionLayout><div className="space-y-4">
    <GlassCard className="p-4">
      <div className="grid gap-2 md:grid-cols-5">
        <Select label="时间范围" value={range} onChange={setRange} options={['7天', '30天', '全部']} />
        <Select label="状态" value={status} onChange={setStatus} options={['已成交', '全部']} />
        <Select label="商品代码" value={symbol} onChange={setSymbol} options={symbols} />
        <Select label="滚动窗口" value={String(rollingWindow)} onChange={(v) => setRollingWindow(Number(v))} options={['10', '20', '50']} />
        <Select label="累计模式" value={equityMode} onChange={(v) => setEquityMode(v as '按单' | '按日')} options={['按单', '按日']} />
      </div>
    </GlassCard>

    <section className="grid gap-3 md:grid-cols-4">
      <StatCard title="总订单数" value={String(metrics?.summary.totalOrders || 0)} numeric />
      <StatCard title="总净收益" value={fmtNum(metrics?.summary.totalProfit)} numeric />
      <StatCard title="夏普比率（Sharpe）" value={fmtRatio(metrics?.metrics.sharpe)} numeric />
      <StatCard title="最大回撤（比例）" value={fmtPct(metrics?.metrics.maxDDPct)} numeric />
    </section>

    <section className="grid gap-3 md:grid-cols-2">
      <ChartCard title="权益曲线（累计Profit）" loading={!charts} reduced={reduced}>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={equitySeries}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="t" hide /><YAxis /><Tooltip /><Line type="monotone" dataKey="v" stroke="#22d3ee" dot={false} /><Brush dataKey="t" height={20} /></LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="每单收益（Profit Per Trade）" loading={!charts} reduced={reduced}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={charts?.series.profitPerTrade || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="t" hide /><YAxis /><Tooltip /><Bar dataKey="v">{(charts?.series.profitPerTrade || []).map((x, i) => <Cell key={i} fill={x.v >= 0 ? '#22c55e' : '#ef4444'} />)}</Bar></BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="滚动指标（胜率/均值）" loading={!charts} reduced={reduced}>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={(charts?.series.rollingWinRate || []).map((x, i) => ({ t: x.t, 胜率: x.v * 100, 平均收益: charts?.series.rollingAvgProfit[i]?.v || 0 }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="t" hide /><YAxis yAxisId="l" /><YAxis yAxisId="r" orientation="right" /><Tooltip /><Line yAxisId="l" type="monotone" dataKey="胜率" stroke="#a78bfa" dot={false} /><Line yAxisId="r" type="monotone" dataKey="平均收益" stroke="#22d3ee" dot={false} /></LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="收益分布（直方图）" loading={!charts} reduced={reduced}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={charts?.dist.profitHistogram || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="bin" hide /><YAxis /><Tooltip /><Bar dataKey="count" fill="#60a5fa" /></BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Top 商品收益" loading={!charts} reduced={reduced}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={charts?.breakdown.bySymbol || []} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="key" width={60} /><Tooltip /><Bar dataKey="sumProfit" fill="#14b8a6" /></BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <GlassCard className="p-4">
        <h3 className="mb-3 font-semibold">周几 × 小时 热力图</h3>
        <div className="grid grid-cols-8 gap-1 text-xs">{Array.from({ length: 7 }).flatMap((_, d) => Array.from({ length: 24 }).map((__, h) => {
          const cell = charts?.heatmap.dowHour.find((x) => x.dow === d && x.hour === h);
          const val = cell?.sumProfit || 0;
          const bg = val > 0 ? `rgba(34,197,94,${Math.min(0.9, Math.abs(val) / 500)})` : val < 0 ? `rgba(239,68,68,${Math.min(0.9, Math.abs(val) / 500)})` : 'rgba(148,163,184,0.15)';
          return <div key={`${d}-${h}`} title={`周${d} ${h}:00 收益 ${fmtNum(val)}`} className="h-5 rounded" style={{ background: bg }} />;
        }))}</div>
      </GlassCard>
    </section>

    <GlassCard className="space-y-3 p-4">
      <h3 className="font-semibold">账户参数与资金流水</h3>
      <div className="grid gap-2 md:grid-cols-3">
        <label className="text-sm">初始本金<input className="input mt-1" value={String(metrics?.settings.initialEquity || 0)} onChange={(e)=>setMetrics((d)=>d?{...d,settings:{...d.settings,initialEquity:Number(e.target.value||0)}}:d)} onBlur={()=>saveSettings({ initialEquity: metrics?.settings.initialEquity || 0 })} /></label>
        <label className="text-sm">年化无风险利率（%）<input className="input mt-1" value={String(metrics?.settings.riskFreeRateAnnual || 0)} onChange={(e)=>setMetrics((d)=>d?{...d,settings:{...d.settings,riskFreeRateAnnual:Number(e.target.value||0)}}:d)} onBlur={()=>saveSettings({ riskFreeRateAnnual: metrics?.settings.riskFreeRateAnnual || 0 })} /></label>
        <label className="text-sm">年化交易日数<input className="input mt-1" value={String(metrics?.settings.tradingDaysPerYear || 252)} onChange={(e)=>setMetrics((d)=>d?{...d,settings:{...d.settings,tradingDaysPerYear:Number(e.target.value||252)}}:d)} onBlur={()=>saveSettings({ tradingDaysPerYear: metrics?.settings.tradingDaysPerYear || 252 })} /></label>
      </div>
      <div className="flex gap-2"><button className="btn-secondary" onClick={()=>setOpenForm('入金')}>入金</button><button className="btn-secondary" onClick={()=>setOpenForm('出金')}>出金</button></div>
      {openForm ? <div className="grid gap-2 rounded-xl border border-border/50 p-3 md:grid-cols-4"><input className="input" placeholder="金额" value={amount} onChange={(e)=>setAmount(e.target.value)} /><input className="input" type="datetime-local" value={dateTime} onChange={(e)=>setDateTime(e.target.value)} /><input className="input" placeholder="备注" value={note} onChange={(e)=>setNote(e.target.value)} /><div className="flex gap-2"><button className="btn-primary" onClick={submitCashflow}>确认</button><button className="btn-secondary" onClick={()=>setOpenForm(null)}>取消</button></div></div> : null}
      <div className="overflow-auto"><table className="min-w-full text-sm"><thead><tr><th className="p-2 text-left">发生时间</th><th className="text-left">类型</th><th className="text-left">金额</th><th className="text-left">备注</th><th className="text-left">操作</th></tr></thead><tbody>{cashflows.slice(0, 10).map((c)=><tr key={c.id} className="border-t border-border/40"><td className="p-2">{String(c.dateTime).replace('T',' ').slice(0,16)}</td><td>{c.amount>=0?'入金':'出金'}</td><td>{fmtNum(c.amount)}</td><td>{c.note||'-'}</td><td><button className="btn-secondary" onClick={()=>removeCashflow(c.id)}>删除</button></td></tr>)}</tbody></table></div>
    </GlassCard>
  </div></MotionLayout>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return <label className="text-sm">{label}<select className="input mt-1" value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>;
}

function ChartCard({ title, children, loading, reduced }: { title: string; children: ReactNode; loading: boolean; reduced: boolean }) {
  return <GlassCard className="p-4"><motion.div initial={reduced ? false : { opacity: 0, y: 8 }} animate={reduced ? undefined : { opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}><h3 className="mb-3 font-semibold">{title}</h3>{loading ? <div className="h-[280px] animate-pulse rounded bg-white/10" /> : children}</motion.div></GlassCard>;
}

function fmtNum(v: number | null | undefined) { return Number(v || 0).toFixed(2); }
function fmtRatio(v: number | null | undefined) { return v == null ? '不可用' : Number(v).toFixed(2); }
function fmtPct(v: number | null | undefined) { return v == null ? '不可用' : `${(Number(v) * 100).toFixed(2)}%`; }
