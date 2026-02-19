import { createTrade, listTrades } from '../lib/db';

async function main() {
  if ((await listTrades()).length >= 10) {
    console.log('Seed skipped (already has data).');
    return;
  }

  const assetClasses = ['Stock', 'CFD', 'Futures', 'Fund', 'Options'] as const;
  for (let i = 0; i < 10; i++) {
    const ac = assetClasses[i % assetClasses.length];
    await createTrade({
      assetClass: ac,
      symbol: ac === 'Options' ? 'AAPL240621C180' : `${ac.slice(0, 2).toUpperCase()}${i}`,
      side: i % 2 ? 'Short' : 'Long',
      entryTime: new Date(Date.now() - (10 - i) * 86400000).toISOString(),
      closeTime: new Date(Date.now() - (9 - i) * 86400000).toISOString(),
      entryPrice: 100 + i,
      stopLoss: 95 + i,
      closePrice: 102 + (i % 3) * 2,
      qty: 1 + i,
      notional: 1000 + i * 300,
      fee: 1.2,
      slippage: 0.3,
      notes: `# Trade ${i + 1}\n- Setup: breakout\n- Lesson: follow stop`,
      takeProfits: [{ price: 104 + i, label: 'tp1' }, { price: 106 + i, label: 'tp2' }],
      partialExits: [{ price: 103 + i, qtyPercent: 40, time: new Date(Date.now() - (9 - i) * 86400000 + 3600000).toISOString() }],
      tags: i % 2 ? ['突破', '纪律'] : ['趋势', '新闻'],
      extra: {
        exchange: 'NASDAQ', currency: 'USD',
        leverage: 10, contractSize: 1, swap: -2,
        contractCode: 'ESU6', expiry: '2026-09-18', multiplier: 50,
        fundType: 'ETF', nav: 1.24, subscribeRedeemMode: 'Secondary',
        underlying: 'AAPL', optionType: 'Call', strike: 180, premium: 2.3, strategyTag: 'Single',
        priceSeries: Array.from({ length: 24 }).map((_, idx) => ({ time: new Date(Date.now() - (10 - i) * 86400000 + idx * 3600000).toISOString(), value: 100 + i + Math.sin(idx / 3) * 3 })),
        importSource: 'seed-v1.0',
        closeBatches: []
      },
    });
  }
  console.log('Seeded 10 trades.');
}

main();
