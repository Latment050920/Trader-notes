import clsx from 'clsx';

export function GlassCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx('glass-card glow-border', className)}>{children}</div>;
}
