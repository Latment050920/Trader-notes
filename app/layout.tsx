import './globals.css';
import Link from 'next/link';
import { BarChart3, FileUp, TableProperties, Settings } from 'lucide-react';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <div className="mx-auto min-h-screen max-w-7xl p-4 md:p-8">
            <header className="glass-panel glow-border mb-6 flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div className="font-semibold">交易订单复盘 v1.1</div>
              <nav className="flex flex-wrap gap-2">
                <Link href="/" className="btn-secondary"><BarChart3 className="h-4 w-4" /> 数据看板</Link>
                <Link href="/orders" className="btn-secondary"><TableProperties className="h-4 w-4" /> 订单列表</Link>
                <Link href="/settings/import" className="btn-secondary"><FileUp className="h-4 w-4" /> 导入CSV</Link>
                <Link href="/settings/import" className="btn-secondary"><Settings className="h-4 w-4" /> 设置</Link>
              </nav>
              <ThemeToggle />
            </header>
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
