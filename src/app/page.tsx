"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Building2,
  User,
  PlusCircle,
  RefreshCw,
  TrendingUp,
  Receipt,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

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
  category?: { name: string };
}

export default function DashboardPage() {
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [activeTab, setActiveTab] = useState<"ALL" | "BUSINESS" | "PERSONAL">("ALL");
  const [loading, setLoading] = useState(true);

  // Transfer Form State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSource, setTransferSource] = useState("");
  const [transferDest, setTransferDest] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferFee, setTransferFee] = useState("0");
  const [transferNote, setTransferNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resWallets, resTx] = await Promise.all([
        fetch("/api/wallets"),
        fetch("/api/transactions"),
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
        setMessage({ text: "Transfer berhasil dicatat beserta biaya admin!", type: "success" });
        setTransferAmount("");
        setTransferFee("0");
        setTransferNote("");
        setShowTransferModal(false);
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

  const filteredTransactions = transactions.filter((t) => {
    if (activeTab === "ALL") return true;
    return t.scope === activeTab;
  });

  const formatIDR = (val: number | string) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="space-y-8">
      {/* Notifikasi Message */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 border ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Saldo Riil</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatIDR(totalBalance)}</div>
          <p className="text-xs text-slate-500 mt-1">Gabungan BNI & 4 E-Wallet</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Omzet Jualan (QRIS)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">+{formatIDR(totalBusinessIncome)}</div>
          <p className="text-xs text-emerald-700 mt-1">Pemasukan Scope Usaha</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Beban Usaha</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">-{formatIDR(totalBusinessExpense)}</div>
          <p className="text-xs text-slate-500 mt-1">Pengeluaran Operasional</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Pengeluaran Pribadi</span>
            <User className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">-{formatIDR(totalPersonalExpense)}</div>
          <p className="text-xs text-slate-500 mt-1">Termasuk Biaya Admin Transfer</p>
        </div>
      </div>

      {/* Wallets List Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">Akun Bank & E-Wallet</h2>
            <p className="text-xs text-slate-500">Saldo riil di masing-masing platform pembayaran</p>
          </div>
          <button
            onClick={() => setShowTransferModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium shadow-sm transition-all"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Transfer Antar Akun</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {wallets.map((w) => (
            <div key={w.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{w.name}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <div className="text-lg font-bold text-slate-900">{formatIDR(w.balance)}</div>
              <span className="text-[10px] text-slate-500 uppercase">{w.type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Transfer Antar Akun</h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                Tutup
              </button>
            </div>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dari Akun (Sumber Potongan)</label>
                <select
                  value={transferSource}
                  onChange={(e) => setTransferSource(e.target.value)}
                  required
                  className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ke Akun (Tujuan Masuk)</label>
                <select
                  value={transferDest}
                  onChange={(e) => setTransferDest(e.target.value)}
                  required
                  className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Pilih Tujuan...</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id} disabled={w.id === transferSource}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal Transfer (Rp)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="100000"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    required
                    className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Biaya Admin (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="1500"
                    value={transferFee}
                    onChange={(e) => setTransferFee(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                💡 Biaya admin otomatis dicatat sebagai <strong>Pengeluaran (Expense)</strong> kategori &quot;Biaya Admin&quot;, sehingga saldo akun sumber dipotong (Nominal + Admin).
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Misal: Top up DANA untuk modal jajan"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Memproses Transfer..." : "Simpan Transfer"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Transaction History Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Riwayat Arus Kas</h2>
            <p className="text-xs text-slate-500">Pemisahan tegas transaksi Bisnis (Omzet) vs Pribadi</p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setActiveTab("BUSINESS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === "BUSINESS" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Usaha / Omzet</span>
            </button>
            <button
              onClick={() => setActiveTab("PERSONAL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === "PERSONAL" ? "bg-white text-amber-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Pribadi</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">Memuat transaksi...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            Belum ada transaksi. Pembayaran QRIS masuk dari DANA & Shopee otomatis muncul di sini!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTransactions.map((tx) => (
              <div key={tx.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl ${
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
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {tx.description || (tx.type === "TRANSFER" ? `Transfer ke ${tx.destinationWallet?.name}` : tx.category?.name || "Transaksi")}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          tx.scope === "BUSINESS" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {tx.scope}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {tx.wallet?.name} {tx.destinationWallet ? `➔ ${tx.destinationWallet.name}` : ""}{" "}
                      • {new Date(tx.transactionDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-sm font-bold ${
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
                  {Number(tx.adminFee) > 0 && (
                    <div className="text-[11px] text-slate-400">
                      Admin: {formatIDR(tx.adminFee)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
