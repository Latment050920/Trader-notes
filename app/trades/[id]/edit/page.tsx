import { notFound } from 'next/navigation';
import { getTrade } from '@/lib/db';
import { TradeForm } from '@/components/TradeForm';

export default async function EditTradePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trade = getTrade(Number(id));
  if (!trade) return notFound();
  return <TradeForm initial={trade} />;
}
