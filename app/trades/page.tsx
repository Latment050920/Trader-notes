import Link from 'next/link';
import { listTrades } from '@/lib/db';
import { computeTotalR } from '@/lib/metrics';

export default async function TradesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const trades = listTrades().filter((t) => {
    if (params.assetClass && t.assetClass !== params.assetClass) return false;
    if (params.symbol && !t.symbol.toLowerCase().includes(params.symbol.toLowerCase())) return false;
    if (params.tag && !t.tags.includes(params.tag)) return false;
    if (params.from && t.entryTime < params.from) return false;
    if (params.to && t.entryTime > params.to) return false;
    return true;
  });

  return <div className="space-y-4">
    <form className="card grid gap-2 p-4 md:grid-cols-6">
      <input className="input" name="assetClass" placeholder="assetClass" defaultValue={params.assetClass}/>
      <input className="input" name="symbol" placeholder="symbol" defaultValue={params.symbol}/>
      <input className="input" name="tag" placeholder="tag" defaultValue={params.tag}/>
      <input className="input" name="from" type="date" defaultValue={params.from}/>
      <input className="input" name="to" type="date" defaultValue={params.to}/>
      <button className="btn-primary" type="submit">Filter</button>
    </form>

    <div className="card overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="border-b bg-slate-50 text-left"><tr><th className="p-3">Time</th><th>Asset</th><th>Symbol</th><th>R</th><th>Tags</th><th></th></tr></thead>
        <tbody>{trades.map((t)=><tr key={t.id} className="border-b"><td className="p-3">{t.entryTime}</td><td>{t.assetClass}</td><td>{t.symbol}</td><td>{(computeTotalR(t)??NaN).toFixed?.(2) || 'N/A'}</td><td>{t.tags.join(', ')}</td><td><Link className="btn-secondary" href={`/trades/${t.id}`}>Detail</Link></td></tr>)}</tbody>
      </table>
    </div>
  </div>;
}
