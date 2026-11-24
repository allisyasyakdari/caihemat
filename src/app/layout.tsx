import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Wallet, LayoutDashboard, History, BellRing } from "lucide-react";

export const metadata: Metadata = {
  title: "Caihemat - Personal & Business Finance Tracker",
  description: "Kelola keuangan pribadi dan omzet jualan QRIS dengan sinkronisasi otomatis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur shadow-sm">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-tight">Caihemat</h1>
                <p className="text-xs text-slate-500">Personal & Business Tracker</p>
              </div>
            </div>

            <nav className="flex items-center gap-2">
              <Link
                href="/"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                <span>Dashboard</span>
              </Link>
              <Link
                href="/logs"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <BellRing className="w-4 h-4 text-indigo-600" />
                <span>Webhook Logs</span>
              </Link>
            </nav>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
