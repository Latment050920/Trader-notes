'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { computeTotalR } from '@/lib/metrics';

export default function TradesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [filters, setFilters] = useState({ assetClass: '', symbol: '', tag: '', from: '', to: '' });

  useEffect(() => {
    fetch('/api/trades').then((r) => r.json()).then(setRows);
  }, []);

  const trades = useMemo(
    () =>
      rows.filter((t) => {
        if (filters.assetClass && t.assetClass !== filters.assetClass) return false;
        if (filters.symbol && !t.symbol.toLowerCase().includes(filters.symbol.toLowerCase())) return false;
        if (filters.tag && !(t.tags || []).includes(filters.tag)) return false;
        if (filters.from && t.entryTime < filters.from) return false;
        if (filters.to && t.entryTime > filters.to) return false;
        return true;
      }),
    [rows, filters],
  );

  return <div className="space-y-4">
    <div className="card grid gap-2 p-4 md:grid-cols-6">
      {Object.keys(filters).map((key) => (
        <input key={key} className="input" placeholder={key} type={key === 'from' || key === 'to' ? 'date' : 'text'} value={(filters as any)[key]} onChange={(e) => setFilters((s) => ({ ...s, [key]: e.target.value }))} />
      ))}
      <button className="btn-secondary" onClick={() => setFilters({ assetClass: '', symbol: '', tag: '', from: '', to: '' })}>Reset</button>
    </div>

    <div className="card overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="border-b bg-slate-50 text-left"><tr><th className="p-3">Time</th><th>Asset</th><th>Symbol</th><th>R</th><th>Tags</th><th></th></tr></thead>
        <tbody>{trades.map((t)=><tr key={t.id} className="border-b"><td className="p-3">{t.entryTime}</td><td>{t.assetClass}</td><td>{t.symbol}</td><td>{(computeTotalR(t)??NaN).toFixed?.(2) || 'N/A'}</td><td>{(t.tags || []).join(', ')}</td><td><Link className="btn-secondary" href={`/trades/${t.id}`}>Detail</Link></td></tr>)}</tbody>
      </table>
    </div>
  </div>;
}
