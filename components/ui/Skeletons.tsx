export function SkeletonCard() {
  return <div className="glass-card h-28 animate-pulse p-4" />;
}

export function SkeletonTable() {
  return (
    <div className="glass-card p-4">
      <div className="mb-3 h-5 w-40 animate-pulse rounded bg-white/10" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-white/10" />
        ))}
      </div>
    </div>
  );
}
