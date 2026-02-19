import { randomUUID } from 'crypto';
import { Trade, TradePayload } from '@/types/trade';
import { getDb, persistDb } from '@/lib/storage/db';

function mapTradeRow(row: any): Trade {
  const extra = row.extra ? JSON.parse(row.extra) : {};
  return {
    ...row,
    extra,
    priceSeries: extra.priceSeries || [],
    takeProfits: [],
    partialExits: [],
    tags: [],
  };
}

function queryAll(db: any, sql: string, params: any[] = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

async function hydrateTrade(base: any): Promise<Trade> {
  const db = await getDb();
  const trade = mapTradeRow(base);
  trade.takeProfits = queryAll(db, 'SELECT id, price, label FROM take_profits WHERE tradeId = ? ORDER BY createdAt', [trade.id]) as any;
  trade.partialExits = queryAll(db, 'SELECT id, price, qtyPercent, time FROM partial_exits WHERE tradeId = ? ORDER BY createdAt', [trade.id]) as any;
  trade.tags = queryAll(db, 'SELECT tag FROM trade_tags WHERE tradeId = ?', [trade.id]).map((r) => String(r.tag));
  return trade;
}

export async function listTrades() {
  const db = await getDb();
  const rows = queryAll(db, 'SELECT * FROM trades ORDER BY entryTime DESC');
  const trades: Trade[] = [];
  for (const row of rows) trades.push(await hydrateTrade(row));
  return trades;
}

export async function getTrade(id: string) {
  const db = await getDb();
  const rows = queryAll(db, 'SELECT * FROM trades WHERE id = ?', [id]);
  if (!rows[0]) return null;
  return hydrateTrade(rows[0]);
}

function syncChildren(db: any, tradeId: string, payload: TradePayload) {
  db.run('DELETE FROM take_profits WHERE tradeId = ?', [tradeId]);
  db.run('DELETE FROM partial_exits WHERE tradeId = ?', [tradeId]);
  db.run('DELETE FROM trade_tags WHERE tradeId = ?', [tradeId]);

  payload.takeProfits.forEach((tp) => {
    db.run('INSERT INTO take_profits (id, tradeId, price, label, createdAt) VALUES (?, ?, ?, ?, ?)', [
      randomUUID(),
      tradeId,
      tp.price,
      tp.label,
      new Date().toISOString(),
    ]);
  });

  payload.partialExits.forEach((p) => {
    db.run('INSERT INTO partial_exits (id, tradeId, price, qtyPercent, time, createdAt) VALUES (?, ?, ?, ?, ?, ?)', [
      randomUUID(),
      tradeId,
      p.price,
      p.qtyPercent,
      p.time || null,
      new Date().toISOString(),
    ]);
  });

  payload.tags.forEach((tag) => {
    db.run('INSERT INTO trade_tags (id, tradeId, tag) VALUES (?, ?, ?)', [randomUUID(), tradeId, tag]);
  });
}

export async function createTrade(payload: TradePayload) {
  const db = await getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO trades (id, assetClass, symbol, side, entryTime, closeTime, entryPrice, stopLoss, closePrice, qty, notional, fee, slippage, notes, extra, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      payload.assetClass,
      payload.symbol,
      payload.side,
      payload.entryTime,
      payload.closeTime || null,
      payload.entryPrice ?? null,
      payload.stopLoss ?? null,
      payload.closePrice ?? null,
      payload.qty ?? null,
      payload.notional ?? null,
      payload.fee ?? null,
      payload.slippage ?? null,
      payload.notes || '',
      JSON.stringify(payload.extra || {}),
      now,
      now,
    ],
  );
  syncChildren(db, id, payload);
  await persistDb();
  return getTrade(id);
}

export async function updateTrade(id: string, payload: TradePayload) {
  const db = await getDb();
  db.run(
    `UPDATE trades SET assetClass=?, symbol=?, side=?, entryTime=?, closeTime=?, entryPrice=?, stopLoss=?, closePrice=?, qty=?, notional=?, fee=?, slippage=?, notes=?, extra=?, updatedAt=? WHERE id=?`,
    [
      payload.assetClass,
      payload.symbol,
      payload.side,
      payload.entryTime,
      payload.closeTime || null,
      payload.entryPrice ?? null,
      payload.stopLoss ?? null,
      payload.closePrice ?? null,
      payload.qty ?? null,
      payload.notional ?? null,
      payload.fee ?? null,
      payload.slippage ?? null,
      payload.notes || '',
      JSON.stringify(payload.extra || {}),
      new Date().toISOString(),
      id,
    ],
  );
  syncChildren(db, id, payload);
  await persistDb();
  return getTrade(id);
}

export async function deleteTrade(id: string) {
  const db = await getDb();
  db.run('DELETE FROM take_profits WHERE tradeId = ?', [id]);
  db.run('DELETE FROM partial_exits WHERE tradeId = ?', [id]);
  db.run('DELETE FROM trade_tags WHERE tradeId = ?', [id]);
  db.run('DELETE FROM trades WHERE id = ?', [id]);
  await persistDb();
}
