# Trader Notes v1.1 - Pepperstone CSV 订单历史导入（纯 JSON 本地库）

本版本彻底移除 sql.js/wasm，采用纯 Node JSON 文件数据库，避免 webpack wasm 编译问题，满足 Windows 零坑本地运行。

## 技术栈
- Next.js + TypeScript + Tailwind
- 纯 Node `fs` JSON 落盘（`./data/orders.json`）
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
- `./data/orders.json`
- 结构：
```json
{
  "orders": [],
  "meta": { "lastImportAt": null, "version": 1 }
}
```
- 重置：删除 `data/orders.json` 后重新执行 `pnpm db:init && pnpm db:seed`

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
- 页面：`/import`（同时保留 `/settings/import`）
- 支持：上传 CSV、前 20 行预览、错误统计、错误报告下载(JSON)
- 导入模式：
  - 导入全部状态（默认）
  - 仅导入已成交
- 重复策略：
  - 跳过重复（默认）
  - 重复则更新（upsert）

## API
- `POST /api/import`
- `GET /api/orders`（支持 q/status/side/start/end/sort/page/pageSize）
- `GET /api/dashboard/summary`

## 字段说明（仅保留 CSV 对应）
每条订单：
- symbol, side, orderType
- volume, filledVolume
- limitPrice, stopLossPrice, avgFillPrice
- status
- updatedAtText
- profit, grossProfit, swap, commission
- orderId

内部字段（仅用于系统功能）：
- id, importedAt, parsedUpdatedAt
