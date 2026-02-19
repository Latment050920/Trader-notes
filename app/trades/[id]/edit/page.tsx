'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { TradeForm } from '@/components/TradeForm';
import { MotionLayout } from '@/components/ui/MotionLayout';
import { GlassCard } from '@/components/ui/GlassCard';

export default function EditTradePage() {
  const params = useParams<{ id: string }>();
  const [trade, setTrade] = useState<any | null>(null);

  useEffect(() => {
    fetch(`/api/trades/${params.id}`).then((r) => r.json()).then(setTrade);
  }, [params.id]);

  if (!trade) return <GlassCard className="p-4">Loading...</GlassCard>;
  return <MotionLayout><TradeForm initial={trade} /></MotionLayout>;
}
