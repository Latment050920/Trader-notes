'use client';

import { Sparkles, Upload } from 'lucide-react';
import { useState } from 'react';
import { MotionLayout } from '@/components/ui/MotionLayout';
import { GlassCard } from '@/components/ui/GlassCard';

export default function SettingsPage() {
  const [ai, setAi] = useState<any>(null);

  return <MotionLayout>
    <div className="grid gap-4 md:grid-cols-2">
      <GlassCard className="space-y-2 p-4">
        <h2 className="font-medium">数据存储</h2>
        <p className="text-sm text-muted">本地文件：<code>./data/trader-notes.sqlite</code></p>
      </GlassCard>

      <GlassCard className="space-y-3 p-4">
        <h2 className="font-medium">v1.1 CSV 导入</h2>
        <button className="btn-secondary" disabled><Upload className="h-4 w-4" /> Coming soon</button>
        <p className="text-xs text-muted">将支持字段映射、清洗、导入预览和错误行提示。</p>
      </GlassCard>

      <GlassCard className="space-y-3 p-4 md:col-span-2">
        <h2 className="font-medium">v2 AI 复盘接口预留</h2>
        <button className="btn-primary" onClick={async () => {
          const res = await fetch('/api/ai/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trade: { symbol: 'DEMO' }, notes: 'demo' }) });
          setAi(await res.json());
        }}><Sparkles className="h-4 w-4" /> 调用 Mock AI</button>
        {ai ? <pre className="overflow-auto rounded-xl bg-white/5 p-3 text-xs">{JSON.stringify(ai, null, 2)}</pre> : null}
      </GlassCard>
    </div>
  </MotionLayout>;
}
