export default function SettingsPage() {
  return <div className="space-y-4">
    <div className="card p-4">
      <h2 className="font-medium">v1.1 CSV 导入预留</h2>
      <p className="mt-2 text-sm text-slate-600">POST /api/csv/import 支持映射与预览接口占位。</p>
    </div>
    <div className="card p-4">
      <h2 className="font-medium">v2 AI 复盘接口预留</h2>
      <p className="mt-2 text-sm text-slate-600">POST /api/ai/review 当前返回 mock response，可替换本地/云端大模型。</p>
    </div>
  </div>;
}
