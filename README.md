# Trader Notes v1.2 - Pepperstone 订单历史 + 账户参数与资金流水

本版本采用**纯 Node JSON 文件数据库**（无 sql.js/wasm/原生编译依赖），可在 Windows 本地快速运行。

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
  "cashflows": [],
  "settings": {
    "initialEquity": 10000,
    "riskFreeRateAnnual": 0,
    "tradingDaysPerYear": 252
  },
  "meta": { "lastImportAt": null, "version": 2 }
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

## v1.2 新增：账户参数与资金流水
- 账户参数：
  - 初始本金（initialEquity）
  - 年化无风险利率（riskFreeRateAnnual）
  - 年化交易日数（tradingDaysPerYear）
- 资金流水：入金/出金、删除、最近流水列表
- Dashboard 指标（中文展示）：
  - 夏普比率（Sharpe）
  - 索提诺比率（Sortino）
  - 最大回撤（Max Drawdown）
  - 年化收益率（CAGR）
  - 卡玛比率（Calmar）
  - 盈利因子（Profit Factor）
  - 期望值（Expectancy）
  - 最大连亏/最大连胜

## API
- `POST /api/import`
- `GET /api/orders`（支持 q/status/side/start/end/sort/page/pageSize）
- `GET /api/dashboard/metrics`
- `GET /api/dashboard/summary`（兼容别名）
- `GET/PUT /api/settings`
- `GET/POST/DELETE /api/cashflows`

## 指标口径（核心）
- 每单净收益 netPnL = Profit + Swap - Commission
- 日收益率 r[d] = dailyNetPnL[d] / equityStart[d]（不含入金出金）
- 夏普：mean(excess) / std(excess, n-1) * sqrt(tradingDaysPerYear)
- 样本 < 20：夏普/索提诺显示不可用（样本不足）
- 胜率定义：净收益>0 为胜，净收益<0 为负，净收益=0 不计入

## 字段说明（仅保留 CSV 对应 + 必要内部字段）
订单字段：
- symbol, side, orderType
- volume, filledVolume
- limitPrice, stopLossPrice, avgFillPrice
- status
- updatedAtText
- profit, grossProfit, swap, commission
- orderId

内部字段（用于系统/统计）：
- id, importedAt, parsedUpdatedAt
