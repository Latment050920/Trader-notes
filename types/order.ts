export type DuplicateStrategy = 'skip' | 'upsert';

export type HistoryOrder = {
  id: string;
  symbol: string;
  side: string;
  orderType: string;
  volume: number | null;
  filledVolume: number | null;
  limitPrice: number | null;
  stopLossPrice: number | null;
  avgFillPrice: number | null;
  status: string;
  updatedAtText: string;
  parsedUpdatedAt: string | null;
  profit: number | null;
  grossProfit: number | null;
  swap: number | null;
  commission: number | null;
  orderId: string;
  importedAt: string;
  createdAt: string;
};

export type ImportErrorRow = {
  row: number;
  reason: string;
  raw: Record<string, string>;
};

export type Cashflow = {
  id: string;
  dateTime: string;
  amount: number;
  note?: string;
  createdAt: string;
};

export type AccountSettings = {
  initialEquity: number;
  riskFreeRateAnnual: number;
  tradingDaysPerYear: number;
};
