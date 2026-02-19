import Database from 'better-sqlite3';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Trade, TradePayload } from '@/types/trade';

const dataDir = path.join(process.cwd(), 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'trader-notes.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assetClass TEXT NOT NULL,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      entryTime TEXT NOT NULL,
      closeTime TEXT,
      entryPrice REAL,
      stopLoss REAL,
      closePrice REAL,
      qty REAL,
      notional REAL,
      fee REAL,
      slippage REAL,
      notes TEXT,
      extra TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS take_profits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tradeId INTEGER NOT NULL,
      price REAL NOT NULL,
      label TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (tradeId) REFERENCES trades(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS partial_exits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tradeId INTEGER NOT NULL,
      price REAL NOT NULL,
      qtyPercent REAL NOT NULL,
      time TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (tradeId) REFERENCES trades(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS trade_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tradeId INTEGER NOT NULL,
      tag TEXT NOT NULL,
      FOREIGN KEY (tradeId) REFERENCES trades(id) ON DELETE CASCADE
    );
  `);
}

function rowToTrade(row: any): Trade {
  return {
    ...row,
    extra: row.extra ? JSON.parse(row.extra) : {},
    priceSeries: row.extra ? JSON.parse(row.extra).priceSeries || [] : [],
    takeProfits: db.prepare('SELECT id, price, label FROM take_profits WHERE tradeId = ? ORDER BY id').all(row.id) as any,
    partialExits: db.prepare('SELECT id, price, qtyPercent, time FROM partial_exits WHERE tradeId = ? ORDER BY id').all(row.id) as any,
    tags: (db.prepare('SELECT tag FROM trade_tags WHERE tradeId = ?').all(row.id) as any[]).map((r) => r.tag),
  };
}

export function listTrades() {
  initDb();
  const rows = db.prepare('SELECT * FROM trades ORDER BY entryTime DESC').all();
  return rows.map(rowToTrade);
}

export function getTrade(id: number) {
  initDb();
  const row = db.prepare('SELECT * FROM trades WHERE id = ?').get(id);
  if (!row) return null;
  return rowToTrade(row);
}

export function createTrade(payload: TradePayload) {
  initDb();
  const now = new Date().toISOString();
  const extra = JSON.stringify(payload.extra || {});
  const stmt = db.prepare(`INSERT INTO trades (
      assetClass,symbol,side,entryTime,closeTime,entryPrice,stopLoss,closePrice,qty,notional,fee,slippage,notes,extra,createdAt,updatedAt
    ) VALUES (@assetClass,@symbol,@side,@entryTime,@closeTime,@entryPrice,@stopLoss,@closePrice,@qty,@notional,@fee,@slippage,@notes,@extra,@createdAt,@updatedAt)`);
  const result = stmt.run({ ...payload, extra, createdAt: now, updatedAt: now });
  const tradeId = Number(result.lastInsertRowid);
  syncChildren(tradeId, payload);
  return getTrade(tradeId);
}

function syncChildren(tradeId: number, payload: TradePayload) {
  db.prepare('DELETE FROM take_profits WHERE tradeId=?').run(tradeId);
  db.prepare('DELETE FROM partial_exits WHERE tradeId=?').run(tradeId);
  db.prepare('DELETE FROM trade_tags WHERE tradeId=?').run(tradeId);
  const tpStmt = db.prepare('INSERT INTO take_profits (tradeId,price,label,createdAt) VALUES (?,?,?,?)');
  payload.takeProfits.forEach((tp) => tpStmt.run(tradeId, tp.price, tp.label, new Date().toISOString()));
  const pxStmt = db.prepare('INSERT INTO partial_exits (tradeId,price,qtyPercent,time,createdAt) VALUES (?,?,?,?,?)');
  payload.partialExits.forEach((p) => pxStmt.run(tradeId, p.price, p.qtyPercent, p.time || null, new Date().toISOString()));
  const tagStmt = db.prepare('INSERT INTO trade_tags (tradeId,tag) VALUES (?,?)');
  payload.tags.forEach((tag) => tagStmt.run(tradeId, tag));
}

export function updateTrade(id: number, payload: TradePayload) {
  initDb();
  const extra = JSON.stringify(payload.extra || {});
  db.prepare(`UPDATE trades SET
      assetClass=@assetClass,symbol=@symbol,side=@side,entryTime=@entryTime,closeTime=@closeTime,
      entryPrice=@entryPrice,stopLoss=@stopLoss,closePrice=@closePrice,qty=@qty,notional=@notional,
      fee=@fee,slippage=@slippage,notes=@notes,extra=@extra,updatedAt=@updatedAt WHERE id=@id
  `).run({ ...payload, id, extra, updatedAt: new Date().toISOString() });
  syncChildren(id, payload);
  return getTrade(id);
}

export function deleteTrade(id: number) {
  initDb();
  db.prepare('DELETE FROM trades WHERE id = ?').run(id);
}
