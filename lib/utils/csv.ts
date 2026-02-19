import iconv from 'iconv-lite';
import { parseTime } from '@/lib/db';

type CsvRow = Record<string, string>;

export function decodeCsv(buffer: Buffer) {
  const utf8 = buffer.toString('utf8');
  if (!utf8.includes('商品代码') && !utf8.includes('订单编号')) {
    return iconv.decode(buffer, 'gb18030');
  }
  return utf8;
}

export function parseCsv(text: string): CsvRow[] {
  const rows: CsvRow[] = [];
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  if (!lines.length) return rows;
  const headers = splitCsvLine(lines[0]);
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const row: CsvRow = {};
    headers.forEach((h, idx) => row[h] = (cols[idx] ?? '').trim());
    rows.push(row);
  }
  return rows;
}

function splitCsvLine(line: string) {
  const out: string[] = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; }
      else q = !q;
    } else if (ch === ',' && !q) {
      out.push(cur); cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function num(v: string) {
  const t = v?.trim();
  if (!t || t.toLowerCase() === 'nan') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function mapPepperstoneRow(row: CsvRow) {
  return {
    symbol: row['商品代码'] || '',
    side: row['买/卖'] || '',
    orderType: row['类型'] || '',
    volume: num(row['数量']),
    filledVolume: num(row['已成交数量']),
    limitPrice: num(row['限价']),
    stopLossPrice: num(row['止损价']),
    avgFillPrice: num(row['成交均价']),
    status: row['状态'] || '',
    updatedAtText: row['更新时间'] || '',
    parsedUpdatedAt: parseTime(row['更新时间'] || ''),
    profit: num(row['Profit']),
    grossProfit: num(row['Gross Profit']),
    swap: num(row['Swap']),
    commission: num(row['Commission']),
    orderId: row['订单编号'] || '',
  };
}
