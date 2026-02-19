'use client';

import { useMemo, useState } from 'react';
import { MotionLayout } from '@/components/ui/MotionLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { fetchJson } from '@/lib/utils/fetchJson';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip'|'upsert'>('skip');
  const [importMode, setImportMode] = useState<'all'|'filled'>('all');
  const [result, setResult] = useState<any>(null);

  const errorDownload = useMemo(() => {
    if (!result?.errors?.length) return null;
    return URL.createObjectURL(new Blob([JSON.stringify(result.errors, null, 2)], { type: 'application/json' }));
  }, [result]);

  const submit = async () => {
    if (!file) return;
    const form = new FormData();
    form.set('file', file);
    form.set('duplicateStrategy', duplicateStrategy);
    form.set('importMode', importMode);
    const res = await fetchJson<any>('/api/import', { method: 'POST', body: form });
    setResult(res);
  };

  return <MotionLayout><div className="space-y-4">
    <GlassCard className="space-y-3 p-4">
      <h2 className="font-semibold">Pepperstone 订单历史 CSV 导入</h2>
      <input className="input" type="file" accept=".csv,text/csv" onChange={(e)=>setFile(e.target.files?.[0] || null)} />
      <div className="grid gap-2 md:grid-cols-2">
        <label className="text-sm">导入模式<select className="input mt-1" value={importMode} onChange={(e)=>setImportMode(e.target.value as any)}><option value="all">导入全部状态</option><option value="filled">仅导入已成交</option></select></label>
        <label className="text-sm">重复策略<select className="input mt-1" value={duplicateStrategy} onChange={(e)=>setDuplicateStrategy(e.target.value as any)}><option value="skip">Skip duplicates</option><option value="upsert">Upsert</option></select></label>
      </div>
      <button className="btn-primary" onClick={submit} disabled={!file}>开始导入</button>
    </GlassCard>

    {result ? <GlassCard className="space-y-3 p-4">
      <p>成功导入 {result.inserted} 行，更新 {result.updated} 行，跳过 {result.skipped} 行，失败 {result.errorRows} 行。</p>
      {errorDownload ? <a className="btn-secondary" href={errorDownload} download="import-errors.json">下载错误报告(JSON)</a> : null}
      <div className="overflow-auto"><table className="min-w-full text-xs"><thead><tr>{Object.keys(result.preview?.[0] || {}).map((k)=><th key={k} className="p-1 text-left">{k}</th>)}</tr></thead><tbody>{(result.preview || []).map((r:any,idx:number)=><tr key={idx}>{Object.values(r).map((v:any,i)=><td key={i} className="p-1">{String(v)}</td>)}</tr>)}</tbody></table></div>
    </GlassCard> : null}
  </div></MotionLayout>;
}
