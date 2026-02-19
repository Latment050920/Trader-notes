# Trader Notes - 多资产交易复盘辅助工具 (Demo v1.0)

离线本地可运行的 Next.js + SQL.js(WASM SQLite) 复盘系统，支持 Stock / CFD / Futures / Fund / Options 统一管理。

## 为什么移除 better-sqlite3
原方案依赖原生绑定，在 Windows 上经常触发 `bindings file not found`、node-gyp/VS Build Tools 等编译问题。当前改为 **sql.js（纯 WASM）**，不需要 C++ 编译链，`pnpm install` 后可直接运行。

## 功能（v1.0）
- 多资产交易 CRUD（含资产类型切换 + 通用字段 + 专属字段）
- 动态止盈/部分止盈录入
- Advanced 区域折叠（fee/slippage）
- 本地持久化：`./data/trader-notes.sqlite`
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
- SQL.js (`sql.js`) + 文件落盘
- TradingView Lightweight Charts

## 运行环境
- 推荐：Node.js 20 LTS
- 兼容目标：Node 18 / 20 / 22（无需 Visual Studio Build Tools、Python、node-gyp）

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

## 数据文件
- 数据库存储：`./data/trader-notes.sqlite`
- 重置数据：删除该文件后重新执行
```bash
pnpm db:init
pnpm db:seed
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
- `lib/storage/db.ts`：sql.js 初始化、建表、加载/落盘
- `lib/storage/persistence.ts`：文件读写与写入队列
- `app/api/**`：所有 DB 访问入口（页面仅 fetch API）
- `components/`、`charts/`、`lib/metrics.ts`

## 替换 AI 接口（未来）
将 `app/api/ai/review/route.ts` 中 mock 替换为实际模型调用，保持请求体结构包含：
- trade（含 assetClass + extra）
- notes
