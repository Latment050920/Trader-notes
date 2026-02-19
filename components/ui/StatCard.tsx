'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { GlassCard } from './GlassCard';

function useCountUp(target: number, duration = 240) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);

  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const from = value;

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(from + (target - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, reduced]);

  return value;
}

export function StatCard({ title, value, hint, numeric = false }: { title: string; value: string; hint?: string; numeric?: boolean }) {
  const reduced = useReducedMotion();
  const target = useMemo(() => {
    if (!numeric) return 0;
    const n = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }, [value, numeric]);
  const animated = useCountUp(target);

  const renderedValue = numeric
    ? value.includes('%')
      ? `${animated.toFixed(1)}%`
      : value.includes('.')
        ? animated.toFixed(2)
        : Math.round(animated).toString()
    : value;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={reduced ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      whileHover={reduced ? {} : { y: -2, scale: 1.01 }}
    >
      <GlassCard className="p-4">
        <p className="text-xs text-muted">{title}</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{numeric ? renderedValue : value}</p>
        {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      </GlassCard>
    </motion.div>
  );
}
