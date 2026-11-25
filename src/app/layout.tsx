import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CaihematLogo } from "@/components/CaihematLogo";

export const metadata: Metadata = {
  title: "Caihemat - Personal & Business Finance Tracker",
  description: "Kelola keuangan pribadi dan omzet jualan QRIS dengan sinkronisasi otomatis",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#059669",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-100 text-slate-900 antialiased selection:bg-emerald-500 selection:text-white">
        {/* Mobile Wrapper: Centers cleanly as an app shell on desktop and full width on phone */}
        <div className="mx-auto min-h-screen max-w-lg bg-slate-50 border-x border-slate-200/80 shadow-2xl relative flex flex-col pb-20">
          {children}
        </div>
      </body>
    </html>
  );
}
