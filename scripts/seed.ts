import { importOrders } from '../lib/db';

async function main() {
  const now = Date.now();
  const rows = Array.from({ length: 12 }).map((_, i) => ({
    symbol: i % 2 ? 'XAUUSD' : 'EURUSD',
    side: i % 2 ? '买入' : '卖出',
    orderType: '市价',
    volume: 1,
    filledVolume: 1,
    limitPrice: null,
    stopLossPrice: 2000 + i,
    avgFillPrice: 2010 + i,
    status: '已成交',
    updatedAtText: new Date(now - i * 3600_000).toISOString(),
    parsedUpdatedAt: new Date(now - i * 3600_000).toISOString(),
    profit: i % 3 === 0 ? -30 + i : 20 + i,
    grossProfit: i % 3 === 0 ? -28 + i : 22 + i,
    swap: -0.5,
    commission: -1.2,
    orderId: `SEED-${i}`,
  }));
  const r = await importOrders(rows, 'skip', false);
  console.log('Seed done', r);
}
main();
