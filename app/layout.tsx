import './globals.css';
import Link from 'next/link';
import { BarChart3, PlusCircle, Settings, TableProperties } from 'lucide-react';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const nav = [
  { href: '/', label: 'Dashboard', icon: BarChart3 },
  { href: '/trades', label: 'Trades', icon: TableProperties },
  { href: '/trades/new', label: 'New', icon: PlusCircle },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <div className="mx-auto min-h-screen max-w-7xl p-4 md:p-8">
            <header className="glass-panel glow-border mb-6 flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-cyan-400/20" />
                <div>
                  <p className="text-sm text-muted">Trade Journal</p>
                  <h1 className="text-base font-semibold">Trader Notes Terminal</h1>
                </div>
              </div>
              <nav className="flex flex-wrap items-center gap-2">
                {nav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} className="btn-secondary" href={item.href}>
                      <Icon className="h-4 w-4" /> {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Link href="/trades/new" className="btn-primary"><PlusCircle className="h-4 w-4" /> Quick Add</Link>
              </div>
            </header>
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
