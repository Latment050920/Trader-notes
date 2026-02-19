'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  return (
    <div className="glass-card inline-flex items-center gap-1 p-1">
      <button className={`btn-secondary px-2 py-1 ${theme === 'light' ? 'border-cyan-300/60' : ''}`} onClick={() => setTheme('light')}><Sun className="h-4 w-4" /></button>
      <button className={`btn-secondary px-2 py-1 ${theme === 'dark' ? 'border-cyan-300/60' : ''}`} onClick={() => setTheme('dark')}><Moon className="h-4 w-4" /></button>
      <button className={`btn-secondary px-2 py-1 ${theme === 'system' ? 'border-cyan-300/60' : ''}`} onClick={() => setTheme('system')}><Monitor className="h-4 w-4" /></button>
    </div>
  );
}
