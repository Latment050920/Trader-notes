import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <div className="glass-card p-4">
        <h2 className="font-semibold">设置</h2>
        <p className="mt-1 text-sm text-muted">账户参数与资金流水管理请前往首页「账户参数」模块。</p>
        <div className="mt-3 flex gap-2">
          <Link href="/" className="btn-secondary">前往数据看板</Link>
          <Link href="/import" className="btn-secondary">前往CSV导入</Link>
        </div>
      </div>
    </div>
  );
}
