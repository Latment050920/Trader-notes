'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { GlassCard } from './GlassCard';

export function StatCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={reduced ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      whileHover={reduced ? {} : { y: -2, scale: 1.01 }}
    >
      <GlassCard className="p-4">
        <p className="text-xs text-muted">{title}</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      </GlassCard>
    </motion.div>
  );
}
