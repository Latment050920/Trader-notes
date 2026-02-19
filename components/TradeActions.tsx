'use client';

import { useRouter } from 'next/navigation';

export function TradeActions({ id }: { id: number }) {
  const router = useRouter();
  return (
    <div className="flex gap-2">
      <a href={`/trades/${id}/edit`} className="btn-secondary">Edit</a>
      <button
        className="btn-secondary"
        onClick={async () => {
          await fetch(`/api/trades/${id}`, { method: 'DELETE' });
          router.push('/trades');
          router.refresh();
        }}
      >
        Delete
      </button>
    </div>
  );
}
