'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { assetClasses, optionTypes, sides, strategyTags } from '@/lib/constants';
import { Trade } from '@/types/trade';

type Props = { initial?: Trade };

const empty = {
  assetClass: 'Stock', symbol: '', side: 'Long', entryTime: '', closeTime: '', entryPrice: '', stopLoss: '', closePrice: '',
  qty: '', notional: '', fee: '', slippage: '', notes: '', tags: '',
  takeProfits: [{ price: '', label: 'tp1' }],
  partialExits: [{ price: '', qtyPercent: '', time: '' }],
  extra: {},
  priceSeriesText: '',
};

export function TradeForm({ initial }: Props) {
  const router = useRouter();
  const [advanced, setAdvanced] = useState(false);
  const [form, setForm] = useState<any>(initial ? {
    ...initial,
    tags: initial.tags.join(','),
    takeProfits: initial.takeProfits.length ? initial.takeProfits : empty.takeProfits,
    partialExits: initial.partialExits.length ? initial.partialExits : empty.partialExits,
    priceSeriesText: JSON.stringify(initial.priceSeries || [], null, 2),
  } : empty);

  const update = (k: string, v: any) => setForm((s: any) => ({ ...s, [k]: v }));

  const sampleSeries = () => {
    const now = Date.now();
    const arr = Array.from({ length: 30 }).map((_, i) => ({
      time: new Date(now + i * 3600_000).toISOString(),
      value: 100 + Math.sin(i / 3) * 5 + i * 0.3,
    }));
    update('priceSeriesText', JSON.stringify(arr, null, 2));
  };

  const extraFields = useMemo(() => {
    const ac = form.assetClass;
    if (ac === 'Stock') return <>
      <input className="input" placeholder="exchange" value={form.extra.exchange || ''} onChange={(e)=>update('extra',{...form.extra,exchange:e.target.value})}/>
      <input className="input" placeholder="currency" value={form.extra.currency || ''} onChange={(e)=>update('extra',{...form.extra,currency:e.target.value})}/>
    </>;
    if (ac === 'CFD') return <>
      <input className="input" placeholder="leverage" value={form.extra.leverage || ''} onChange={(e)=>update('extra',{...form.extra,leverage:e.target.value})}/>
      <input className="input" placeholder="contractSize" value={form.extra.contractSize || ''} onChange={(e)=>update('extra',{...form.extra,contractSize:e.target.value})}/>
      <input className="input" placeholder="swap" value={form.extra.swap || ''} onChange={(e)=>update('extra',{...form.extra,swap:e.target.value})}/>
    </>;
    if (ac === 'Futures') return <>
      <input className="input" placeholder="contractCode" value={form.extra.contractCode || ''} onChange={(e)=>update('extra',{...form.extra,contractCode:e.target.value})}/>
      <input className="input" type="date" value={form.extra.expiry || ''} onChange={(e)=>update('extra',{...form.extra,expiry:e.target.value})}/>
      <input className="input" placeholder="multiplier" value={form.extra.multiplier || ''} onChange={(e)=>update('extra',{...form.extra,multiplier:e.target.value})}/>
    </>;
    if (ac === 'Fund') return <>
      <select className="input" value={form.extra.fundType || ''} onChange={(e)=>update('extra',{...form.extra,fundType:e.target.value})}><option value="">fundType</option><option>Fund</option><option>ETF</option></select>
      <input className="input" placeholder="nav" value={form.extra.nav || ''} onChange={(e)=>update('extra',{...form.extra,nav:e.target.value})}/>
      <input className="input" placeholder="subscribeRedeemMode" value={form.extra.subscribeRedeemMode || ''} onChange={(e)=>update('extra',{...form.extra,subscribeRedeemMode:e.target.value})}/>
    </>;
    return <>
      <input className="input" placeholder="underlying" value={form.extra.underlying || ''} onChange={(e)=>update('extra',{...form.extra,underlying:e.target.value})}/>
      <select className="input" value={form.extra.optionType || 'Call'} onChange={(e)=>update('extra',{...form.extra,optionType:e.target.value})}>{optionTypes.map(v=><option key={v}>{v}</option>)}</select>
      <input className="input" placeholder="strike" value={form.extra.strike || ''} onChange={(e)=>update('extra',{...form.extra,strike:e.target.value})}/>
      <input className="input" type="date" value={form.extra.expiry || ''} onChange={(e)=>update('extra',{...form.extra,expiry:e.target.value})}/>
      <input className="input" placeholder="premium" value={form.extra.premium || ''} onChange={(e)=>update('extra',{...form.extra,premium:e.target.value})}/>
      <input className="input" placeholder="multiplier(default 100)" value={form.extra.multiplier || '100'} onChange={(e)=>update('extra',{...form.extra,multiplier:e.target.value})}/>
      <select className="input" value={form.extra.strategyTag || ''} onChange={(e)=>update('extra',{...form.extra,strategyTag:e.target.value})}><option value="">strategyTag</option>{strategyTags.map(v=><option key={v}>{v}</option>)}</select>
    </>;
  }, [form]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      closeTime: form.closeTime || null,
      entryPrice: form.entryPrice === '' ? null : Number(form.entryPrice),
      stopLoss: form.stopLoss === '' ? null : Number(form.stopLoss),
      closePrice: form.closePrice === '' ? null : Number(form.closePrice),
      qty: form.qty === '' ? null : Number(form.qty),
      notional: form.notional === '' ? null : Number(form.notional),
      fee: form.fee === '' ? null : Number(form.fee),
      slippage: form.slippage === '' ? null : Number(form.slippage),
      takeProfits: form.takeProfits.filter((x:any)=>x.price !== '').map((x:any)=>({ price: Number(x.price), label: x.label || 'tp'})),
      partialExits: form.partialExits.filter((x:any)=>x.price !== '').map((x:any)=>({ price: Number(x.price), qtyPercent: Number(x.qtyPercent), time: x.time || null })),
      tags: form.tags.split(',').map((s:string)=>s.trim()).filter(Boolean),
      extra: { ...form.extra, priceSeries: form.priceSeriesText ? JSON.parse(form.priceSeriesText) : [] },
    };
    const method = initial ? 'PUT' : 'POST';
    const url = initial ? `/api/trades/${initial.id}` : '/api/trades';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    router.push('/trades');
    router.refresh();
  };

  return <form onSubmit={submit} className="card space-y-4 p-5">
    <div className="flex flex-wrap gap-2 rounded-xl bg-slate-100 p-1">{assetClasses.map((v)=><button type="button" key={v} className={`btn ${form.assetClass===v?'bg-white shadow':'text-slate-500'}`} onClick={()=>update('assetClass',v)}>{v}</button>)}</div>
    <div className="grid gap-3 md:grid-cols-3">
      <input className="input" placeholder="symbol" value={form.symbol} onChange={(e)=>update('symbol',e.target.value)} required/>
      <select className="input" value={form.side} onChange={(e)=>update('side',e.target.value)}>{sides.map(v=><option key={v}>{v}</option>)}</select>
      <input className="input" type="datetime-local" value={form.entryTime} onChange={(e)=>update('entryTime',e.target.value)} required/>
      <input className="input" type="datetime-local" value={form.closeTime || ''} onChange={(e)=>update('closeTime',e.target.value)} />
      <input className="input" placeholder="entryPrice" value={form.entryPrice} onChange={(e)=>update('entryPrice',e.target.value)} />
      <input className="input" placeholder="stopLoss" value={form.stopLoss} onChange={(e)=>update('stopLoss',e.target.value)} />
      <input className="input" placeholder="closePrice" value={form.closePrice} onChange={(e)=>update('closePrice',e.target.value)} />
      <input className="input" placeholder="qty" value={form.qty} onChange={(e)=>update('qty',e.target.value)} />
      <input className="input" placeholder="notional" value={form.notional} onChange={(e)=>update('notional',e.target.value)} />
    </div>
    <div className="grid gap-2 md:grid-cols-2">{extraFields}</div>

    <div>
      <div className="mb-2 flex items-center justify-between"><p className="label">Take Profits</p><button className="btn-secondary" type="button" onClick={()=>update('takeProfits',[...form.takeProfits,{price:'',label:`tp${form.takeProfits.length+1}`}])}>+ Add</button></div>
      {form.takeProfits.map((tp:any,idx:number)=><div key={idx} className="mb-2 grid grid-cols-2 gap-2"><input className="input" placeholder="price" value={tp.price} onChange={(e)=>{const n=[...form.takeProfits];n[idx].price=e.target.value;update('takeProfits',n)}}/><input className="input" placeholder="label" value={tp.label} onChange={(e)=>{const n=[...form.takeProfits];n[idx].label=e.target.value;update('takeProfits',n)}}/></div>)}
    </div>

    <div>
      <div className="mb-2 flex items-center justify-between"><p className="label">Partial Exits</p><button className="btn-secondary" type="button" onClick={()=>update('partialExits',[...form.partialExits,{price:'',qtyPercent:'',time:''}])}>+ Add</button></div>
      {form.partialExits.map((p:any,idx:number)=><div key={idx} className="mb-2 grid grid-cols-3 gap-2"><input className="input" placeholder="price" value={p.price} onChange={(e)=>{const n=[...form.partialExits];n[idx].price=e.target.value;update('partialExits',n)}}/><input className="input" placeholder="qtyPercent" value={p.qtyPercent} onChange={(e)=>{const n=[...form.partialExits];n[idx].qtyPercent=e.target.value;update('partialExits',n)}}/><input className="input" type="datetime-local" value={p.time || ''} onChange={(e)=>{const n=[...form.partialExits];n[idx].time=e.target.value;update('partialExits',n)}}/></div>)}
    </div>

    <div className="space-y-2"><button type="button" className="btn-secondary" onClick={()=>setAdvanced(!advanced)}>Advanced</button>{advanced && <div className="grid gap-2 md:grid-cols-2"><input className="input" placeholder="fee" value={form.fee} onChange={(e)=>update('fee',e.target.value)}/><input className="input" placeholder="slippage" value={form.slippage} onChange={(e)=>update('slippage',e.target.value)}/></div>}</div>

    <textarea className="input min-h-24" placeholder="notes markdown" value={form.notes} onChange={(e)=>update('notes',e.target.value)} />
    <input className="input" placeholder="tags,comma,separated" value={form.tags} onChange={(e)=>update('tags',e.target.value)} />
    <div className="space-y-2"><div className="flex items-center justify-between"><p className="label">Price Series JSON</p><button type="button" className="btn-secondary" onClick={sampleSeries}>Generate Demo Series</button></div><textarea className="input min-h-36 font-mono text-xs" value={form.priceSeriesText} onChange={(e)=>update('priceSeriesText',e.target.value)} /></div>
    <button className="btn-primary" type="submit">Save Trade</button>
  </form>;
}
