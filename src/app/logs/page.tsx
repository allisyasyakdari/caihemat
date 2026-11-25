"use client";

import React, { useState, useEffect } from "react";
import { BellRing, CheckCircle2, XCircle, Clock, RefreshCw, Smartphone } from "lucide-react";

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
  transaction?: { id: string };
}

export default function WebhookLogsPage() {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Webhook Notification Logs</h1>
          <p className="text-xs text-slate-500">
            Log mentah kiriman MacroDroid / Tasker dari notifikasi DANA & Shopee di HP Android
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Memuat log notifikasi...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            Belum ada notifikasi yang diterima dari webhook. Pastikan MacroDroid di HP sudah aktif!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between gap-4 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                      <Smartphone className="w-3 h-3" />
                      {log.appName}
                    </span>
                    <span className="text-xs font-semibold text-slate-800">{log.notificationTitle}</span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
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

                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono mb-2">
                  &quot;{log.notificationText}&quot;
                </p>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    {log.parsedAmount && (
                      <span className="text-emerald-600 font-bold">
                        Terekstrak: {formatIDR(log.parsedAmount)} ➔ {log.wallet?.name || "Dompet"}
                      </span>
                    )}
                    {log.errorMessage && <span className="text-red-500 font-medium">Info: {log.errorMessage}</span>}
                  </div>
                  <div>
                    {new Date(log.receivedAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
