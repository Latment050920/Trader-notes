# Trader Notes v1.1 - Pepperstone CSV 订单历史导入

本版本仅围绕 Pepperstone 订单历史 CSV（固定字段）构建。
已移除旧版复盘字段（如 notes/tags/takeProfits/partialExits/assetClass 等）。

## 技术栈
- Next.js + TypeScript + Tailwind
- sql.js (WASM SQLite，Windows 免原生编译)
- framer-motion + lucide-react + next-themes

## Node 版本
- 推荐 Node 20 LTS（18/22 也可）

## 启动
```bash
pnpm install
pnpm db:init
pnpm db:seed
pnpm dev
```

## 数据文件
- `./data/trader-notes.sqlite`
- 重置：删除该文件后重新执行 `pnpm db:init && pnpm db:seed`

## Pepperstone CSV 固定列
1. 商品代码
2. 买/卖
3. 类型
4. 数量
5. 已成交数量
6. 限价
7. 止损价
8. 成交均价
9. 状态
10. 更新时间
11. Profit
12. Gross Profit
13. Swap
14. Commission
15. 订单编号

## 导入说明
- 页面：`/settings/import`
- 支持：拖拽/选择 CSV、前20行预览、错误统计、错误报告下载(JSON)
- 导入模式：
  - 导入全部状态（默认）
  - 仅导入已成交
- 重复策略：
  - Skip duplicates（默认）
  - Upsert（按 orderId 更新）

## 页面
- `/` Dashboard（订单统计 + Profit 时间序列 + 分布 + Symbol 聚合）
- `/orders` 订单列表（筛选：symbol/status/side/date range）
- `/settings/import` CSV 导入

## API
- `GET /api/orders`
- `POST /api/import`
- `GET /api/dashboard/summary`

## 字段说明（仅保留 CSV 对应）
表：`history_orders`
- id（内部 UUID）
- symbol, side, orderType
- volume, filledVolume
- limitPrice, stopLossPrice, avgFillPrice
- status
- updatedAtText, parsedUpdatedAt（用于排序/筛选）
- profit, grossProfit, swap, commission
- orderId
- importedAt, createdAt
