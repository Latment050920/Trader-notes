'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { TradeForm } from '@/components/TradeForm';

export default function EditTradePage() {
  const params = useParams<{ id: string }>();
  const [trade, setTrade] = useState<any | null>(null);

  useEffect(() => {
    fetch(`/api/trades/${params.id}`).then((r) => r.json()).then(setTrade);
  }, [params.id]);

  if (!trade) return <div className="card p-4">Loading...</div>;
  return <TradeForm initial={trade} />;
}
