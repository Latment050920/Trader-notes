CREATE TABLE trades (
  id TEXT PRIMARY KEY,
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

CREATE TABLE take_profits (
  id TEXT PRIMARY KEY,
  tradeId TEXT NOT NULL,
  price REAL NOT NULL,
  label TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE partial_exits (
  id TEXT PRIMARY KEY,
  tradeId TEXT NOT NULL,
  price REAL NOT NULL,
  qtyPercent REAL NOT NULL,
  time TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE trade_tags (
  id TEXT PRIMARY KEY,
  tradeId TEXT NOT NULL,
  tag TEXT NOT NULL
);
