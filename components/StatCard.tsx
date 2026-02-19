export function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
