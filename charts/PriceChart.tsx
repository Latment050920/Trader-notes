'use client';

import { useEffect, useRef } from 'react';
import { createChart, LineSeries, CandlestickSeries, ISeriesApi, Time } from 'lightweight-charts';
import { Trade } from '@/types/trade';

export function PriceChart({ trade }: { trade: Trade }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const chart = createChart(ref.current, { height: 320, layout: { background: { color: '#ffffff' }, textColor: '#475569' } });
    const line = chart.addSeries(LineSeries);
    const series = (trade.priceSeries || []).map((p) => ({ time: p.time as Time, value: p.value }));
    if (series.length) line.setData(series);
    const markers: any[] = [];
    if (trade.entryPrice) markers.push({ time: trade.entryTime as Time, position: 'belowBar', color: '#2563eb', shape: 'arrowUp', text: 'Entry' });
    if (trade.stopLoss && trade.entryTime) markers.push({ time: trade.entryTime as Time, position: 'belowBar', color: '#ef4444', shape: 'circle', text: 'SL' });
    trade.takeProfits.forEach((tp) => markers.push({ time: trade.closeTime || trade.entryTime as Time, position: 'aboveBar', color: '#22c55e', shape: 'square', text: tp.label }));
    trade.partialExits.forEach((p, idx) => markers.push({ time: (p.time || trade.entryTime) as Time, position: 'aboveBar', color: '#a855f7', shape: 'diamond', text: `P${idx + 1}` }));
    if (trade.closePrice && trade.closeTime) markers.push({ time: trade.closeTime as Time, position: 'aboveBar', color: '#0f172a', shape: 'arrowDown', text: 'Close' });
    (line as unknown as ISeriesApi<'Line'>).setMarkers(markers);
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [trade]);

  return <div className="card p-3"><div ref={ref} /></div>;
}
