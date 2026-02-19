import dayjs from 'dayjs';
import { PricePoint, Trade } from '@/types/trade';

export function computeRiskPerUnit(trade: Trade) {
  if (trade.entryPrice == null || trade.stopLoss == null) return null;
  const risk = Math.abs(trade.entryPrice - trade.stopLoss);
  return risk === 0 ? null : risk;
}

function rAtPrice(trade: Trade, price: number, riskPerUnit: number) {
  return trade.side === 'Long'
    ? (price - (trade.entryPrice || 0)) / riskPerUnit
    : ((trade.entryPrice || 0) - price) / riskPerUnit;
}

export function computeTotalR(trade: Trade) {
  const risk = computeRiskPerUnit(trade);
  if (!risk || trade.entryPrice == null) return null;
  let weighted = 0;
  let allocated = 0;
  trade.partialExits.forEach((p) => {
    const w = Math.max(0, p.qtyPercent) / 100;
    weighted += rAtPrice(trade, p.price, risk) * w;
    allocated += w;
  });
  if (trade.closePrice != null && allocated < 1) {
    weighted += rAtPrice(trade, trade.closePrice, risk) * (1 - allocated);
    allocated = 1;
  }
  if (allocated === 0 && trade.closePrice != null) return rAtPrice(trade, trade.closePrice, risk);
  return allocated > 0 ? weighted : null;
}

export function computeMfeMae(trade: Trade, series: PricePoint[]) {
  const risk = computeRiskPerUnit(trade);
  if (!risk || !series.length || trade.entryPrice == null) return { mfe: null, mae: null };
  const rValues = series.map((p) => rAtPrice(trade, p.value, risk));
  return { mfe: Math.max(...rValues), mae: Math.min(...rValues) };
}

export function holdDuration(entry: string, close?: string | null) {
  if (!close) return 'Open';
  const diff = dayjs(close).diff(dayjs(entry), 'minute');
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}h ${m}m`;
}

export function outcomeLabel(trade: Trade) {
  if (trade.closePrice == null) return 'Open';
  if (trade.stopLoss != null) {
    if (trade.side === 'Long' && trade.closePrice <= trade.stopLoss) return 'Stopped';
    if (trade.side === 'Short' && trade.closePrice >= trade.stopLoss) return 'Stopped';
  }
  const bestTp = trade.takeProfits[0]?.price;
  if (bestTp != null) {
    if (trade.side === 'Long' && trade.closePrice >= bestTp) return 'Take Profit';
    if (trade.side === 'Short' && trade.closePrice <= bestTp) return 'Take Profit';
  }
  return 'Manual Close';
}

export function aggregate(trades: Trade[]) {
  const total = trades.length;
  const rs = trades.map(computeTotalR).filter((v): v is number => v != null);
  const wins = rs.filter((r) => r > 0).length;
  const totalR = rs.reduce((a, b) => a + b, 0);
  return {
    total,
    winRate: total ? (wins / total) * 100 : 0,
    totalR,
    avgR: rs.length ? totalR / rs.length : 0,
  };
}
