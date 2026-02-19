export type AssetClass = 'Stock' | 'CFD' | 'Futures' | 'Fund' | 'Options';
export type Side = 'Long' | 'Short';

export type TakeProfit = { id?: string; price: number; label: string };
export type PartialExit = { id?: string; price: number; qtyPercent: number; time?: string | null };
export type PricePoint = { time: string; value: number };

export type Trade = {
  id: string;
  assetClass: AssetClass;
  symbol: string;
  side: Side;
  entryTime: string;
  closeTime?: string | null;
  entryPrice?: number | null;
  stopLoss?: number | null;
  closePrice?: number | null;
  qty?: number | null;
  notional?: number | null;
  fee?: number | null;
  slippage?: number | null;
  notes?: string | null;
  extra?: Record<string, unknown>;
  priceSeries?: PricePoint[];
  takeProfits: TakeProfit[];
  partialExits: PartialExit[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type TradePayload = Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>;
