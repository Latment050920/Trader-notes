# Trader Notes - 多资产交易复盘辅助工具 (Demo v1.0)

离线本地可运行的 Next.js + SQLite 复盘系统，支持 Stock / CFD / Futures / Fund / Options 统一管理。

## 功能（v1.0）
- 多资产交易 CRUD（含资产类型切换 + 通用字段 + 专属字段）
- 动态止盈/部分止盈录入
- Advanced 区域折叠（fee/slippage）
- SQLite 本地持久化：`data/trader-notes.db`
- Dashboard：总览、R 分布、Long/Short、AssetClass 对比
- 交易列表筛选：assetClass/symbol/tag/日期
- 详情页：价格图（Lightweight Charts）+ overlay 标记（entry/sl/tp/partial/close）+ 指标卡（R/MFE/MAE/持仓时长/状态）
- Markdown 复盘笔记渲染
- 示例价格序列生成器（用于离线 Demo）

## 预留
- v1.1 CSV 导入接口：`POST /api/csv/import`
- v2 AI 复盘接口：`POST /api/ai/review`（mock）

## 技术栈
- Next.js App Router + TypeScript + TailwindCSS
- SQLite (`better-sqlite3`)
- TradingView Lightweight Charts

## 快速开始
```bash
pnpm install
pnpm db:init
pnpm db:seed
pnpm dev
```
访问：`http://localhost:3000`

## 生产模式
```bash
pnpm build
pnpm start
```

## 数据结构
- `trades`：通用字段 + `extra(JSON)` 扩展
- `take_profits`
- `partial_exits`
- `trade_tags`

`extra` 预留结构示例：
- `closeBatches`（未来分批平仓）
- `importSource`（未来导入来源追踪）
- `priceSeries`（离线图表序列）

## 目录
- `app/` 页面与 API
- `components/` 业务组件
- `charts/` 图表组件
- `lib/` db + 指标计算
- `types/` 类型定义
- `scripts/` 初始化与 seed
- `db/schema.sql` 结构说明

## 替换 AI 接口（未来）
将 `app/api/ai/review/route.ts` 中 mock 替换为实际模型调用，保持请求体结构包含：
- trade（含 assetClass + extra）
- notes
