import { NextRequest, NextResponse } from 'next/server';
import { decodeCsv, mapPepperstoneRow, parseCsv } from '@/lib/utils/csv';
import { importOrders } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  const duplicateStrategy = (form.get('duplicateStrategy') as 'skip' | 'upsert' | null) || 'skip';
  const importMode = (form.get('importMode') as 'all' | 'filled' | null) || 'all';
  if (!file) return NextResponse.json({ error: 'missing file' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = decodeCsv(buffer);
  const parsed = parseCsv(text);
  const mapped = parsed.map(mapPepperstoneRow);
  const result = await importOrders(mapped, duplicateStrategy, importMode === 'filled');

  return NextResponse.json({
    preview: parsed.slice(0, 20),
    totalRows: parsed.length,
    errorRows: result.errors.length,
    inserted: result.inserted,
    updated: result.updated,
    skipped: result.skipped,
    errors: result.errors,
  });
}
