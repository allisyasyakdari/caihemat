"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Building2,
  User,
  RefreshCw,
  TrendingUp,
  PieChart as PieIcon,
  BellRing,
  CheckCircle2,
  AlertCircle,
  Utensils,
  Car,
  ShoppingBag,
  SlidersHorizontal,
  ChevronRight,
  Layers,
  Sparkles,
} from "lucide-react";
import { CaihematLogo } from "@/components/CaihematLogo";
import { DonutChart, ChartSegment } from "@/components/DonutChart";

interface WalletItem {
  id: string;
  name: string;
  slug: string;
  type: string;
  balance: string | number;
}

interface TransactionItem {
  id: string;
  walletId: string;
  destinationWalletId?: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  scope: "PERSONAL" | "BUSINESS";
  amount: string | number;
  adminFee: string | number;
  description?: string;
  transactionDate: string;
  wallet: WalletItem;
  destinationWallet?: WalletItem;
  category?: { id: string; name: string };
}

export default function MobileDashboardPage() {
  // Splashscreen state
  const [showSplash, setShowSplash] = useState(true);

  // App Navigation tab: "HOME" | "ANALYTICS" | "TRANSFER"
  const [navTab, setNavTab] = useState<"HOME" | "ANALYTICS" | "TRANSFER">("HOME");

  // Data states
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [scopeFilter, setScopeFilter] = useState<"ALL" | "BUSINESS" | "PERSONAL">("ALL");
  const [loading, setLoading] = useState(true);

  // Re-classify Modal
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);
  const [isUpdatingScope, setIsUpdatingScope] = useState(false);

  // Transfer Form State
  const [transferSource, setTransferSource] = useState("");
  const [transferDest, setTransferDest] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferFee, setTransferFee] = useState("0");
  const [transferNote, setTransferNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Auto-dismiss Splashscreen
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resWallets, resTx] = await Promise.all([
        fetch("/api/wallets", { cache: "no-store" }),
        fetch("/api/transactions", { cache: "no-store" }),
      ]);
      const dataWallets = await resWallets.json();
      const dataTx = await resTx.json();

      if (dataWallets.success) setWallets(dataWallets.data);
      if (dataTx.success) setTransactions(dataTx.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Quick 1-Click Toggle Scope (Business ⇄ Personal)
  const handleToggleScope = async (tx: TransactionItem) => {
    setIsUpdatingScope(true);
    const newScope = tx.scope === "BUSINESS" ? "PERSONAL" : "BUSINESS";
    const newCategoryName = newScope === "BUSINESS" ? "Penjualan QRIS" : "Uang Masuk Pribadi";

    try {
      const res = await fetch("/api/transactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tx.id,
          scope: newScope,
          category_name: newCategoryName,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({
          text: `Transaksi berhasil diubah menjadi: ${newScope === "BUSINESS" ? "Omzet Jualan 💼" : "Pribadi 👤"}`,
          type: "success",
        });
        setSelectedTx(null);
        fetchData();
      }
    } catch (e: any) {
      setMessage({ text: e.message || "Gagal mengubah kategori", type: "error" });
    } finally {
      setIsUpdatingScope(false);
    }
  };

  // Ubah Kategori Khusus
  const handleChangeCategory = async (categoryName: string) => {
    if (!selectedTx) return;
    setIsUpdatingScope(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTx.id,
          category_name: categoryName,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ text: `Kategori diubah ke "${categoryName}"!`, type: "success" });
        setSelectedTx(null);
        fetchData();
      }
    } catch (e: any) {
      setMessage({ text: e.message, type: "error" });
    } finally {
      setIsUpdatingScope(false);
    }
  };

  // Submit Transfer
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_wallet_id: transferSource,
          destination_wallet_id: transferDest,
          amount: parseFloat(transferAmount),
          admin_fee: parseFloat(transferFee || "0"),
          description: transferNote || "Transfer Antar Akun",
        }),
      });

      const json = await res.json();
      if (json.success) {
        setMessage({ text: "Transfer berhasil & biaya admin otomatis tercatat!", type: "success" });
        setTransferAmount("");
        setTransferFee("0");
        setTransferNote("");
        setNavTab("HOME");
        fetchData();
      } else {
        setMessage({ text: json.message || "Gagal transfer", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Kalkulasi Keuangan
  const totalBalance = wallets.reduce((acc, w) => acc + Number(w.balance || 0), 0);
  const totalBusinessIncome = transactions
    .filter((t) => t.scope === "BUSINESS" && t.type === "INCOME")
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const totalBusinessExpense = transactions
    .filter((t) => t.scope === "BUSINESS" && t.type === "EXPENSE")
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const totalPersonalExpense = transactions
    .filter((t) => t.scope === "PERSONAL" && t.type === "EXPENSE")
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  // Donut Chart Segments (Kategori Pengeluaran Pribadi & Usaha)
  const expenseTransactions = transactions.filter((t) => t.type === "EXPENSE");
  const totalExpenses = expenseTransactions.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const categoryTotals: { [key: string]: number } = {};
  expenseTransactions.forEach((t) => {
    const catName = t.category?.name || "Lain-lain";
    categoryTotals[catName] = (categoryTotals[catName] || 0) + Number(t.amount || 0);
  });

  const categoryColorPalette: { [key: string]: string } = {
    "Makan & Minum": "#f97316", // Orange
    "Transportasi": "#06b6d4", // Cyan
    "Biaya Admin": "#ef4444", // Red
    "Belanja & Kebutuhan": "#8b5cf6", // Purple
    "Operasional Usaha": "#3b82f6", // Blue
    "Pengeluaran Pribadi": "#10b981", // Emerald
    "Lain-lain": "#64748b", // Slate
  };

  const chartSegments: ChartSegment[] = Object.keys(categoryTotals).map((name) => {
    const amount = categoryTotals[name];
    const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
    return {
      name,
      amount,
      color: categoryColorPalette[name] || "#14b8a6",
      percentage,
    };
  }).sort((a, b) => b.amount - a.amount);

  const filteredTransactions = transactions.filter((t) => {
    if (scopeFilter === "ALL") return true;
    return t.scope === scopeFilter;
  });

  const formatIDR = (val: number | string) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
  };

  const getCategoryIcon = (name?: string) => {
    const lower = (name || "").toLowerCase();
    if (lower.includes("makan") || lower.includes("minum") || lower.includes("resto")) return <Utensils className="w-4 h-4 text-orange-500" />;
    if (lower.includes("transport") || lower.includes("grab") || lower.includes("gojek")) return <Car className="w-4 h-4 text-cyan-500" />;
    if (lower.includes("belanja") || lower.includes("indomaret")) return <ShoppingBag className="w-4 h-4 text-purple-500" />;
    return <Layers className="w-4 h-4 text-slate-500" />;
  };

  return (
    <>
      {/* 1. ANIMATED SPLASHSCREEN */}
      {showSplash && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-950 text-white transition-opacity duration-500 ease-out">
          <div className="relative animate-pulse">
            <div className="absolute -inset-4 bg-emerald-500/30 rounded-full blur-xl" />
            <CaihematLogo size={72} className="relative shadow-2xl" />
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-6 bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent">
            Caihemat
          </h1>
          <p className="text-xs text-emerald-300/80 mt-1 font-medium">Personal & Business Tracker</p>
          <div className="w-32 h-1 bg-slate-800 rounded-full overflow-hidden mt-8">
            <div className="h-full bg-emerald-500 rounded-full animate-[progress_1s_ease-in-out_infinite]" />
          </div>
        </div>
      )}

      {/* 2. TOP MOBILE APP BAR */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <CaihematLogo size={32} />
          <div>
            <h1 className="text-base font-black tracking-tight text-slate-900 leading-none">Caihemat</h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Live Sync Active
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            title="Refresh Data"
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          </button>
          <Link
            href="/logs"
            className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors relative"
            title="Webhook Logs"
          >
            <BellRing className="w-4 h-4 text-indigo-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500" />
          </Link>
        </div>
      </header>

      {/* 3. ALERT / NOTIFICATION MESSAGE */}
      {message && (
        <div className="mx-4 mt-3">
          <div
            className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold border shadow-sm animate-in fade-in slide-in-from-top-2 duration-300 ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="flex-1">{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-1">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 4. MAIN CONTENT AREA (BY TAB) */}
      <div className="p-4 space-y-5">
        {/* TAB 1: HOME */}
        {navTab === "HOME" && (
          <>
            {/* HERO BALANCE CARD */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 p-5 text-white shadow-xl shadow-emerald-900/20">
              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between text-emerald-200/90 text-xs font-semibold mb-1">
                <span>Total Saldo Riil</span>
                <span className="px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-bold tracking-wider">
                  5 DOMPET
                </span>
              </div>

              <div className="text-3xl font-black tracking-tight mt-1">{formatIDR(totalBalance)}</div>

              {/* Sub-metrics */}
              <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/15">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5">
                  <div className="flex items-center gap-1.5 text-emerald-300 text-[11px] font-semibold">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Omzet Jualan (QRIS)</span>
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">+{formatIDR(totalBusinessIncome)}</div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5">
                  <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-semibold">
                    <User className="w-3.5 h-3.5" />
                    <span>Pengeluaran Pribadi</span>
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">-{formatIDR(totalPersonalExpense)}</div>
                </div>
              </div>
            </div>

            {/* WALLETS HORIZONTAL SCROLLER */}
            <div>
              <div className="flex items-center justify-between mb-2.5 px-0.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Akun & Dompet</h2>
                <button
                  onClick={() => setNavTab("TRANSFER")}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  <span>Transfer</span>
                </button>
              </div>

              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none snap-x">
                {wallets.map((w) => (
                  <div
                    key={w.id}
                    className="min-w-[125px] flex-1 p-3 rounded-2xl bg-white border border-slate-200/90 shadow-sm snap-start shrink-0"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">
                        {w.name}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 leading-tight">{formatIDR(w.balance)}</div>
                    <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider mt-1 block">
                      {w.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* QUICK PREVIEW GRAFIK PENGELUARAN */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-orange-50 text-orange-600">
                    <PieIcon className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900">Analisis Pengeluaran</h3>
                </div>
                <button
                  onClick={() => setNavTab("ANALYTICS")}
                  className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-0.5"
                >
                  <span>Detail</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <DonutChart
                segments={chartSegments.slice(0, 4)}
                totalAmount={totalExpenses}
                formatIDR={formatIDR}
                title="Beban Bulan Ini"
              />
            </div>

            {/* TRANSACTIONS FEED WITH SMART QRIS CLASSIFIER */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Riwayat & Klasifikasi QRIS</h3>
                  <p className="text-[10px] text-slate-500">Ketuk badge untuk ubah Jualan ⇄ Pribadi</p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setScopeFilter("ALL")}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      scopeFilter === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => setScopeFilter("BUSINESS")}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      scopeFilter === "BUSINESS" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    Jualan
                  </button>
                  <button
                    onClick={() => setScopeFilter("PERSONAL")}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      scopeFilter === "PERSONAL" ? "bg-white text-amber-700 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    Pribadi
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400">Memuat transaksi...</div>
              ) : filteredTransactions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">Belum ada transaksi.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredTransactions.map((tx) => (
                    <div key={tx.id} className="py-3 flex items-center justify-between gap-3 group">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`p-2 rounded-2xl shrink-0 ${
                            tx.type === "INCOME"
                              ? "bg-emerald-50 text-emerald-600"
                              : tx.type === "EXPENSE"
                              ? "bg-red-50 text-red-600"
                              : "bg-blue-50 text-blue-600"
                          }`}
                        >
                          {tx.type === "INCOME" ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : tx.type === "EXPENSE" ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowLeftRight className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {tx.description || (tx.type === "TRANSFER" ? `Transfer ➔ ${tx.destinationWallet?.name}` : tx.category?.name || "Transaksi")}
                          </div>

                          <div className="flex items-center gap-1.5 mt-1">
                            {/* 1-Click Interactive Scope Badge */}
                            <button
                              onClick={() => handleToggleScope(tx)}
                              disabled={isUpdatingScope}
                              title="Klik untuk ubah status Jualan / Pribadi"
                              className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 transition-all active:scale-95 ${
                                tx.scope === "BUSINESS"
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                  : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                              }`}
                            >
                              {tx.scope === "BUSINESS" ? (
                                <>
                                  <Building2 className="w-2.5 h-2.5" />
                                  <span>Omzet Jualan</span>
                                </>
                              ) : (
                                <>
                                  <User className="w-2.5 h-2.5" />
                                  <span>Pribadi</span>
                                </>
                              )}
                            </button>

                            {/* Category Tag (Click to change) */}
                            {tx.category && (
                              <button
                                onClick={() => setSelectedTx(tx)}
                                className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 truncate max-w-[110px]"
                              >
                                {tx.category.name}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`text-xs font-black ${
                            tx.type === "INCOME"
                              ? "text-emerald-600"
                              : tx.type === "EXPENSE"
                              ? "text-red-600"
                              : "text-slate-900"
                          }`}
                        >
                          {tx.type === "INCOME" ? "+" : tx.type === "EXPENSE" ? "-" : ""}
                          {formatIDR(tx.amount)}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          {tx.wallet?.name} • {new Date(tx.transactionDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: ANALYTICS (VISUAL DONUT CHART & KATEGORI) */}
        {navTab === "ANALYTICS" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 mb-1">Visualisasi Pengeluaran</h2>
              <p className="text-xs text-slate-500 mb-4">Analisis visual ke mana uang Anda mengalir bulan ini</p>

              <DonutChart
                segments={chartSegments}
                totalAmount={totalExpenses}
                formatIDR={formatIDR}
                title="Total Beban"
              />
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Omzet Usaha</span>
                <div className="text-lg font-black text-emerald-600 mt-1">+{formatIDR(totalBusinessIncome)}</div>
                <span className="text-[10px] text-slate-400">Total QRIS Masuk</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700">Makan & Minum</span>
                <div className="text-lg font-black text-slate-900 mt-1">
                  -{formatIDR(categoryTotals["Makan & Minum"] || 0)}
                </div>
                <span className="text-[10px] text-slate-400">Resto & Cafe</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TRANSFER ANTAR AKUN */}
        {navTab === "TRANSFER" && (
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-4 animate-in fade-in duration-300">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Transfer Antar Akun</h2>
              <p className="text-xs text-slate-500">Biaya admin otomatis tercatat sebagai Pengeluaran Pribadi</p>
            </div>

            <form onSubmit={handleTransfer} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Dari Akun (Sumber Potongan)</label>
                <select
                  value={transferSource}
                  onChange={(e) => setTransferSource(e.target.value)}
                  required
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Pilih Sumber...</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Saldo: {formatIDR(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Ke Akun (Tujuan Masuk)</label>
                <select
                  value={transferDest}
                  onChange={(e) => setTransferDest(e.target.value)}
                  required
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Pilih Tujuan...</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id} disabled={w.id === transferSource}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nominal (Rp)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="50000"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Biaya Admin (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="1500"
                    value={transferFee}
                    onChange={(e) => setTransferFee(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200/60 text-[11px] text-amber-900 leading-relaxed">
                💡 Biaya admin otomatis tercatat sebagai <strong>Pengeluaran Pribadi</strong> berkategori &quot;Biaya Admin&quot;, sehingga saldo akun sumber dipotong (Nominal + Admin).
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Catatan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Misal: Top up DANA untuk jajan"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? "Memproses..." : "Eksekusi Transfer"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 5. MODAL RE-KLASIFIKASI KATEGORI TRANSAKSI */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Kelompokkan Transaksi</h3>
                <p className="text-[11px] text-slate-500">{formatIDR(selectedTx.amount)}</p>
              </div>
              <button onClick={() => setSelectedTx(null)} className="text-slate-400 font-bold hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tujuan Dana</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleToggleScope(selectedTx)}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    selectedTx.scope === "BUSINESS"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Omzet Jualan</span>
                </button>

                <button
                  onClick={() => handleToggleScope(selectedTx)}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    selectedTx.scope === "PERSONAL"
                      ? "border-amber-600 bg-amber-50 text-amber-800"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Uang Pribadi</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pilih Kategori</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  "Makan & Minum",
                  "Transportasi",
                  "Belanja & Kebutuhan",
                  "Penjualan QRIS",
                  "Biaya Admin",
                  "Operasional Usaha",
                ].map((catName) => (
                  <button
                    key={catName}
                    onClick={() => handleChangeCategory(catName)}
                    className="p-2 rounded-xl text-left text-[11px] font-semibold border border-slate-100 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 text-slate-700 transition-colors truncate"
                  >
                    {catName}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. BOTTOM APP NAVIGATION BAR (MOBILE FIRST) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-lg mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-6 py-2.5 flex items-center justify-between shadow-lg">
        <button
          onClick={() => setNavTab("HOME")}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
            navTab === "HOME" ? "text-emerald-600 scale-105" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Wallet className="w-5 h-5" />
          <span>Home</span>
        </button>

        <button
          onClick={() => setNavTab("ANALYTICS")}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
            navTab === "ANALYTICS" ? "text-emerald-600 scale-105" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <PieIcon className="w-5 h-5" />
          <span>Grafik</span>
        </button>

        <button
          onClick={() => setNavTab("TRANSFER")}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
            navTab === "TRANSFER" ? "text-emerald-600 scale-105" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <ArrowLeftRight className="w-5 h-5" />
          <span>Transfer</span>
        </button>

        <Link
          href="/logs"
          className="flex flex-col items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-all"
        >
          <BellRing className="w-5 h-5" />
          <span>Logs</span>
        </Link>
      </nav>
    </>
  );
}
