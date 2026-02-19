'use client';

import { motion, useReducedMotion } from 'framer-motion';

export function Segmented({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const reduced = useReducedMotion();
  return (
    <div className="glass-card relative flex flex-wrap gap-1 p-1">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className="relative z-10 rounded-lg px-3 py-1.5 text-sm"
        >
          {value === opt && !reduced ? (
            <motion.span
              layoutId="segmented-active"
              className="absolute inset-0 -z-10 rounded-lg bg-cyan-400/20"
              transition={{ duration: 0.2, ease: 'easeOut' }}
            />
          ) : null}
          {opt}
        </button>
      ))}
    </div>
  );
}
