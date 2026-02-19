'use client';

import { useMemo, useState } from 'react';
import { MotionLayout } from '@/components/ui/MotionLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { fetchJson } from '@/lib/utils/fetchJson';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'upsert'>('skip');
  const [importMode, setImportMode] = useState<'all' | 'filled'>('all');
  const [result, setResult] = useState<any>(null);
  const [errorText, setErrorText] = useState('');

  const errorDownload = useMemo(() => {
    if (!result?.errorReport?.length) return null;
    return URL.createObjectURL(new Blob([JSON.stringify(result.errorReport, null, 2)], { type: 'application/json' }));
  }, [result]);

  const submit = async () => {
    if (!file) return;
    setErrorText('');
    const form = new FormData();
    form.set('file', file);
    form.set('duplicateStrategy', duplicateStrategy);
    form.set('importMode', importMode);
    try {
      const res = await fetchJson<any>('/api/import', { method: 'POST', body: form });
      setResult(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrorText(msg);
      try {
        console.log('导入错误详情', JSON.parse(msg));
      } catch {
        console.log('导入错误详情', msg);
      }
    }
  };

  return <MotionLayout><div className="space-y-4">
    <GlassCard className="space-y-2 p-4">
      <h2 className="font-semibold">设置入口</h2>
      <p className="text-sm text-muted">账户参数与资金流水管理已迁移到首页「账户参数」模块。</p>
    </GlassCard>

    <GlassCard className="space-y-3 p-4">
      <h2 className="font-semibold">Pepperstone 订单历史 CSV 导入</h2>
      <input className="input" type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <div className="grid gap-2 md:grid-cols-2">
        <label className="text-sm">导入模式<select className="input mt-1" value={importMode} onChange={(e) => setImportMode(e.target.value as any)}><option value="all">导入全部状态</option><option value="filled">仅导入已成交</option></select></label>
        <label className="text-sm">重复策略<select className="input mt-1" value={duplicateStrategy} onChange={(e) => setDuplicateStrategy(e.target.value as any)}><option value="skip">跳过重复</option><option value="upsert">重复则更新</option></select></label>
      </div>
      <button className="btn-primary" onClick={submit} disabled={!file}>开始导入</button>
      {errorText ? <p className="text-sm text-rose-300">导入失败：{errorText}</p> : null}
    </GlassCard>

    {result ? <GlassCard className="space-y-3 p-4">
      <p>导入成功 {result.imported} 行，跳过 {result.skipped} 行，失败 {result.failed} 行。</p>
      {result.failed > 0 && errorDownload ? <a className="btn-secondary" href={errorDownload} download="import-errors.json">下载错误报告(JSON)</a> : null}
      {result.errorReportFile ? <p className="text-xs text-muted">错误报告文件：data/{result.errorReportFile}</p> : null}
      <div className="overflow-auto"><table className="min-w-full text-xs"><thead><tr>{Object.keys(result.preview?.[0] || {}).map((k) => <th key={k} className="p-1 text-left">{k}</th>)}</tr></thead><tbody>{(result.preview || []).map((r: any, idx: number) => <tr key={idx}>{Object.values(r).map((v: any, i) => <td key={i} className="p-1">{String(v)}</td>)}</tr>)}</tbody></table></div>
    </GlassCard> : null}
  </div></MotionLayout>;
}
