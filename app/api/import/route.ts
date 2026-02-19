import { NextRequest, NextResponse } from 'next/server';
import { decodeCsv, parseCsv, PEPPERSTONE_HEADERS, safeParseRow } from '@/lib/utils/csv';
import { importOrders } from '@/lib/db';
import { writeFileSync } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const duplicateStrategy = (form.get('duplicateStrategy') as 'skip' | 'upsert' | null) || 'skip';
    const importMode = (form.get('importMode') as 'all' | 'filled' | null) || 'all';
    if (!file) {
      return NextResponse.json({ ok: false, error: { message: '缺少文件', code: 'MISSING_FILE' } }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = decodeCsv(buffer);
    const { headers, rows } = parseCsv(text);

    const missing = PEPPERSTONE_HEADERS.filter((h) => !headers.includes(h));
    if (missing.length > 0) {
      return NextResponse.json(
        { ok: false, error: { code: 'MISSING_COLUMNS', missing, got: headers } },
        { status: 400 },
      );
    }

    const parsedOk: any[] = [];
    const errors: Array<{ rowIndex: number; reason: string; raw: Record<string, string> }> = [];

    rows.forEach((row, idx) => {
      const parsed = safeParseRow(row);
      if (!parsed.ok) {
        errors.push({ rowIndex: idx + 2, reason: parsed.reason, raw: row });
      } else {
        parsedOk.push(parsed.data);
      }
    });

    const result = await importOrders(parsedOk, duplicateStrategy, importMode === 'filled');
    const allErrors = [...errors, ...result.errors.map((e) => ({ rowIndex: e.row, reason: e.reason, raw: e.raw as any }))];

    let errorReportFile: string | null = null;
    if (allErrors.length > 0) {
      errorReportFile = `import-errors-${Date.now()}.json`;
      const filePath = path.join(process.cwd(), 'data', errorReportFile);
      writeFileSync(filePath, JSON.stringify(allErrors, null, 2), 'utf8');
    }

    return NextResponse.json(
      {
        ok: true,
        imported: result.inserted + result.updated,
        skipped: result.skipped,
        failed: allErrors.length,
        errorsPreview: allErrors.slice(0, 20),
        errorReport: allErrors,
        errorReportFile,
        preview: rows.slice(0, 20),
        totalRows: rows.length,
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: {
          message,
          name: (err as any)?.name,
          stack: process.env.NODE_ENV !== 'production' ? (err as any)?.stack : undefined,
        },
      },
      { status: 500 },
    );
  }
}
