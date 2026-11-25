"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BellRing, RefreshCw, Smartphone, ChevronLeft, CheckCircle2, Clock, XCircle } from "lucide-react";
import { CaihematLogo } from "@/components/CaihematLogo";

interface RawLog {
  id: string;
  appName: string;
  notificationTitle: string;
  notificationText: string;
  status: "PENDING" | "PARSED" | "IGNORED" | "FAILED";
  parsedAmount: string | number | null;
  errorMessage?: string;
  receivedAt: string;
  wallet?: { name: string };
  transaction?: { id: string; scope: string; category?: { name: string } };
}

export default function WebhookLogsMobilePage() {
  const [logs, setLogs] = useState<RawLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/raw-notifications", { cache: "no-store" });
      const json = await res.json();
      if (json.success) setLogs(json.data);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatIDR = (val: number | string) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="p-1.5 -ml-1 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-sm font-black text-slate-900 leading-tight">Webhook Logs</h1>
            <p className="text-[10px] text-slate-500">Pusat Notifikasi Mentah Android</p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          <span>Refresh</span>
        </button>
      </header>

      {/* Content */}
      <main className="p-4 space-y-3 flex-1">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Memuat log notifikasi...</div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 bg-white rounded-3xl p-6 border border-slate-200/80">
            Belum ada notifikasi yang diterima dari MacroDroid.
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 shrink-0">
                    <Smartphone className="w-3 h-3" />
                    {log.appName}
                  </span>
                  <span className="text-xs font-bold text-slate-900 truncate">{log.notificationTitle}</span>
                </div>

                <span
                  className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                    log.status === "PARSED"
                      ? "bg-emerald-100 text-emerald-800"
                      : log.status === "IGNORED"
                      ? "bg-slate-100 text-slate-600"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {log.status}
                </span>
              </div>

              <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-mono break-words leading-relaxed">
                &quot;{log.notificationText}&quot;
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  {log.parsedAmount ? (
                    <span className="text-emerald-600 font-bold">
                      +{formatIDR(log.parsedAmount)} ({log.wallet?.name})
                    </span>
                  ) : log.errorMessage ? (
                    <span className="text-slate-400 font-medium truncate max-w-[170px]">{log.errorMessage}</span>
                  ) : null}
                </div>
                <span>
                  {new Date(log.receivedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          ))
        )}
      </main>

      {/* Floating Back to Home button on mobile */}
      <div className="sticky bottom-4 mx-4">
        <Link
          href="/"
          className="w-full py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard Utama</span>
        </Link>
      </div>
    </div>
  );
}
