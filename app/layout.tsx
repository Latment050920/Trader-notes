import './globals.css';
import Link from 'next/link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="mx-auto min-h-screen max-w-7xl p-4 md:p-8">
          <header className="mb-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 shadow-card backdrop-blur">
            <h1 className="text-xl font-semibold">Trader Notes v1.0</h1>
            <nav className="flex gap-2 text-sm">
              <Link className="btn-secondary" href="/">Dashboard</Link>
              <Link className="btn-secondary" href="/trades">Trades</Link>
              <Link className="btn-secondary" href="/trades/new">New Trade</Link>
              <Link className="btn-secondary" href="/settings">Settings</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
