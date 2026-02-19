# Trader Notes v1.2 - Pepperstone 订单历史可视化平台

本版本保持**纯 Node JSON 文件数据库**（无 sql.js / wasm / 原生编译依赖），并升级 Dashboard 图表分析能力。目标是 Windows 本地 `pnpm install + pnpm dev` 低门槛运行。

## 技术栈
- Next.js + TypeScript + TailwindCSS
- 纯 Node `fs` JSON 落盘（`./data/orders.json`）
- Framer Motion（微动效）
- Recharts（图表渲染）
- next-themes（主题）

## Node 版本
- 推荐 Node 20 LTS（18/22 也可）

## 启动与初始化
```bash
pnpm install
pnpm db:init
pnpm db:seed
pnpm dev
```

### db:init 说明
- `pnpm db:init` 仅负责创建/修复 `data/orders.json` 基础结构。
- 相关存储文件已改为 `lib/storage/jsondb.server.ts`（不再依赖 `server-only` 包），因此可在 `tsx scripts/init-db.ts` 的纯 Node 环境稳定运行。

## 数据文件
- 文件：`./data/orders.json`
- 结构：
```json
{
  "orders": [],
  "cashflows": [],
  "settings": {
    "initialEquity": 10000,
    "riskFreeRateAnnual": 0,
    "tradingDaysPerYear": 252
  },
  "meta": { "lastImportAt": null, "version": 2 }
}
```

## Pepperstone CSV 固定列（15列）
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
- 页面：`/import`（别名到 `/settings/import`）
- 支持：上传 CSV、预览、逐行容错、错误报告下载
- 导入模式：全部状态 / 仅已成交
- 重复策略：跳过重复（默认）/ upsert

## Dashboard 图表（v1.2）
- 权益曲线（按单/按日切换，支持 Brush）
- 每单收益分布（正负分色）
- 滚动指标（滚动胜率 / 滚动平均收益 / 滚动波动）
- 收益分布直方图
- Top 商品代码收益条形图
- 周几 × 小时热力图

## API
- `POST /api/import`
- `GET /api/orders`（`q/status/side/start/end/sort/page/pageSize`）
- `GET /api/dashboard/metrics`
- `GET /api/dashboard/summary`（summary + charts 聚合返回）
- `GET /api/dashboard/charts`（图表专用，支持缓存）
  - Query: `start/end/symbol/status/rollingWindow`
- `GET/PUT /api/settings`
- `GET/POST/DELETE /api/cashflows`

## 指标口径（核心）
- 每单净收益：`netPnL = Profit + Swap - Commission`
- 日收益率：`r[d] = dailyNetPnL[d] / equityStart[d]`（不含入金/出金）
- 夏普：`mean(excess) / std(excess, n-1) * sqrt(tradingDaysPerYear)`
- 样本 `<20`：夏普/索提诺显示“不可用（样本不足）”

## 字段约束
仅保留 CSV 字段 + 必要内部字段：
- CSV: `symbol, side, orderType, volume, filledVolume, limitPrice, stopLossPrice, avgFillPrice, status, updatedAtText, profit, grossProfit, swap, commission, orderId`
- 内部: `id, importedAt, parsedUpdatedAt`
