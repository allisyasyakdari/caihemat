"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  BarChart3,
  Briefcase,
  Check,
  Home,
  Info,
  ListChecks,
  QrCode,
  ShoppingBag,
  Receipt,
  User,
  Utensils,
  Car,
  X,
  Eye,
  EyeOff,
  Smartphone,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";

/* ───────────── Types & data ───────────── */
type Scope = "BUSINESS" | "PERSONAL";
type Kind = "income" | "expense" | "transfer";
type CategoryId = "food" | "transport" | "shop" | "admin";
type Tab = "home" | "analysis" | "transfer" | "logs";

interface Wallet {
  id: string;
  name: string;
  slug?: string;
  balance: number;
  gradient: string;
}

interface Tx {
  id: string | number;
  title: string;
  amount: number;
  kind: Kind;
  scope: Scope;
  category?: CategoryId;
  categoryName?: string;
  walletId: string;
  time: string;
}

interface RawLog {
  id: string;
  appName: string;
  notificationTitle: string;
  notificationText: string;
  status: "PENDING" | "PARSED" | "IGNORED" | "FAILED";
  parsedAmount: number | null;
  receivedAt: string;
}

const CATEGORIES: Record<CategoryId, { label: string; hint: string; color: string; icon: LucideIcon }> = {
  food: { label: "Makan & Minum", hint: "Warung, Resto, Cafe", color: "#f97316", icon: Utensils },
  transport: { label: "Transportasi", hint: "Grab, Gojek, Bensin", color: "#06b6d4", icon: Car },
  shop: { label: "Belanja & Kebutuhan", hint: "Indomaret, Toko", color: "#8b5cf6", icon: ShoppingBag },
  admin: { label: "Biaya Admin Transfer", hint: "Potongan transfer", color: "#ef4444", icon: Receipt },
};

const WALLET_GRADIENTS: Record<string, string> = {
  bni: "from-orange-400 to-amber-600",
  dana: "from-sky-400 to-blue-600",
  shopeepay: "from-orange-500 to-red-500",
  gopay: "from-emerald-400 to-teal-600",
  ovo: "from-violet-500 to-purple-700",
};

const rupiah = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");

/* ───────────── Logo ───────────── */
function CaihematLogo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="Logo Caihemat">
      <defs>
        <linearGradient id="chg" x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34d399" />
          <stop offset=".55" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id="chs" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fff" stopOpacity=".7" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* wallet body */}
      <rect x="6" y="18" width="52" height="38" rx="12" fill="url(#chg)" />
      <rect x="6" y="18" width="52" height="19" rx="12" fill="url(#chs)" />
      {/* flowing water */}
      <path d="M13 40c5-5 9 5 14 0s9 5 14 0 7 3 10 0" stroke="#fff" strokeOpacity=".9" strokeWidth="3" strokeLinecap="round" />
      <path d="M13 47c5-5 9 5 14 0s9 5 14 0 7 3 10 0" stroke="#fff" strokeOpacity=".45" strokeWidth="3" strokeLinecap="round" />
      {/* droplet */}
      <path d="M32 3c5 7 9 11 9 16a9 9 0 0 1-18 0c0-5 4-9 9-16z" fill="url(#chg)" stroke="#fff" strokeWidth="2.5" />
      <ellipse cx="29" cy="16" rx="1.8" ry="3" fill="#fff" opacity=".8" transform="rotate(20 29 16)" />
      {/* clasp */}
      <circle cx="49" cy="30" r="3.2" fill="#fff" />
    </svg>
  );
}

/* ───────────── Splash ───────────── */
function Splash() {
  const [phase, setPhase] = useState<"show" | "fade" | "gone">("show");
  useEffect(() => {
    const a = setTimeout(() => setPhase("fade"), 1800);
    const b = setTimeout(() => setPhase("gone"), 2500);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);
  if (phase === "gone") return null;
  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 transition-opacity duration-700 ${
        phase === "fade" ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="absolute h-64 w-64 rounded-full bg-white/10 blur-3xl animate-pulse" />
      <div className="relative animate-[chSplash_1s_cubic-bezier(.2,.9,.3,1.2)_both]">
        <div className="rounded-[28px] bg-white/15 p-5 shadow-2xl ring-1 ring-white/30 backdrop-blur-xl">
          <CaihematLogo size={72} />
        </div>
      </div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-white animate-[chRise_.9s_.35s_both]">Caihemat</h1>
      <p className="mt-1 text-sm text-emerald-50/80 animate-[chRise_.9s_.55s_both]">Personal & Business Tracker</p>
    </div>
  );
}

/* ───────────── Hero ───────────── */
function HeroCard({ total, omzet, personal }: { total: number; omzet: number; personal: number }) {
  const [hidden, setHidden] = useState(false);
  const show = (n: number) => (hidden ? "Rp ••••••" : rupiah(n));
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 p-5 text-white shadow-xl shadow-teal-900/20">
      <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-cyan-300/30 blur-3xl" />
      <div className="relative flex items-center justify-between">
        <p className="text-sm text-emerald-50/90">Total saldo riil</p>
        <button
          onClick={() => setHidden((h) => !h)}
          aria-label="Sembunyikan saldo"
          className="rounded-full bg-white/15 p-2 backdrop-blur transition active:scale-90"
        >
          {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      <p className="relative mt-1 text-[34px] font-bold leading-tight tracking-tight">{show(total)}</p>
      <p className="relative text-xs text-emerald-50/80">Gabungan semua dompet</p>

      <div className="relative mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/15 p-3 ring-1 ring-white/25 backdrop-blur-md transition active:scale-95">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-300/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-50">
            <Briefcase size={10} /> BUSINESS
          </span>
          <p className="mt-2 text-[11px] text-emerald-50/80">Omzet Jualan (QRIS)</p>
          <p className="text-base font-semibold">{show(omzet)}</p>
        </div>
        <div className="rounded-2xl bg-white/15 p-3 ring-1 ring-white/25 backdrop-blur-md transition active:scale-95">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/40 px-2 py-0.5 text-[10px] font-semibold text-amber-50">
            <User size={10} /> PERSONAL
          </span>
          <p className="mt-2 text-[11px] text-emerald-50/80">Pengeluaran Pribadi</p>
          <p className="text-base font-semibold">{show(personal)}</p>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Wallets ───────────── */
function WalletSlider({ wallets }: { wallets: Wallet[] }) {
  return (
    <section>
      <h2 className="mb-3 px-1 text-sm font-semibold text-slate-700">Dompet saya</h2>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {wallets.map((w) => (
          <div
            key={w.id}
            className={`relative h-28 w-40 shrink-0 snap-start overflow-hidden rounded-2xl bg-gradient-to-br ${w.gradient} p-3 text-white shadow-lg transition active:scale-95`}
          >
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/20" />
            <p className="relative text-xs font-medium text-white/90 truncate">{w.name}</p>
            <p className="relative mt-9 text-lg font-bold tracking-tight">{rupiah(w.balance)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────── Donut ───────────── */
function DonutChart({ txs }: { txs: Tx[] }) {
  const [active, setActive] = useState<CategoryId | null>(null);
  const data = useMemo(() => {
    const sums: Record<CategoryId, number> = { food: 0, transport: 0, shop: 0, admin: 0 };
    txs.forEach((t) => {
      if (t.kind === "expense" && t.scope === "PERSONAL" && t.category && sums[t.category] !== undefined) {
        sums[t.category] += t.amount;
      }
    });
    const total = Object.values(sums).reduce((a, b) => a + b, 0);
    return { sums, total };
  }, [txs]);

  const R = 70,
    C = 2 * Math.PI * R;
  let offset = 0;
  const ids = Object.keys(CATEGORIES) as CategoryId[];

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-sm font-semibold text-slate-700">Pengeluaran bulan ini</h2>
      <div className="relative mx-auto mt-4 h-52 w-52">
        <svg viewBox="0 0 200 200" className="-rotate-90">
          <circle cx="100" cy="100" r={R} fill="none" stroke="#f1f5f9" strokeWidth="26" />
          {data.total > 0 &&
            ids.map((id) => {
              const len = (data.sums[id] / data.total) * C;
              const el = (
                <circle
                  key={id}
                  cx="100"
                  cy="100"
                  r={R}
                  fill="none"
                  stroke={CATEGORIES[id].color}
                  strokeWidth={active === id ? 34 : 26}
                  strokeDasharray={`${Math.max(len - 3, 0)} ${C}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                  className="cursor-pointer transition-all duration-300"
                  opacity={active && active !== id ? 0.35 : 1}
                  onMouseEnter={() => setActive(id)}
                  onMouseLeave={() => setActive(null)}
                  onClick={() => setActive(active === id ? null : id)}
                />
              );
              offset += len;
              return el;
            })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="max-w-[90px] text-[11px] leading-tight text-slate-500">
            {active ? CATEGORIES[active].label : "Total"}
          </p>
          <p className="text-lg font-bold text-slate-800">{rupiah(active ? data.sums[active] : data.total)}</p>
          {active && (
            <p className="text-xs font-semibold" style={{ color: CATEGORIES[active].color }}>
              {Math.round((data.sums[active] / data.total) * 100)}%
            </p>
          )}
        </div>
      </div>

      <ul className="mt-4 space-y-1">
        {ids.map((id) => {
          const c = CATEGORIES[id];
          const pct = data.total ? Math.round((data.sums[id] / data.total) * 100) : 0;
          return (
            <li key={id}>
              <button
                onClick={() => setActive(active === id ? null : id)}
                className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition active:scale-[.98] ${
                  active === id ? "bg-slate-50" : ""
                }`}
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl text-white shrink-0" style={{ background: c.color }}>
                  <c.icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-800">{c.label}</span>
                  <span className="block truncate text-[11px] text-slate-400">{c.hint}</span>
                </span>
                <span className="text-right shrink-0">
                  <span className="block text-sm font-semibold text-slate-800">{pct}%</span>
                  <span className="block text-[11px] text-slate-400">{rupiah(data.sums[id])}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ───────────── Transactions + Smart QRIS Classifier ───────────── */
function TxRow({ tx, walletName, onToggle }: { tx: Tx; walletName: string; onToggle: (id: string | number) => void }) {
  const isIncome = tx.kind === "income";
  const isTransfer = tx.kind === "transfer";
  const cat = tx.category ? CATEGORIES[tx.category] : null;
  const Icon = isTransfer ? ArrowLeftRight : isIncome ? QrCode : cat?.icon ?? Receipt;
  const biz = tx.scope === "BUSINESS";

  return (
    <li className="animate-[chRise_.4s_both] rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white"
          style={{ background: isIncome ? "#10b981" : isTransfer ? "#64748b" : cat?.color || "#f59e0b" }}
        >
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-800">{tx.title}</p>
          <p className="truncate text-[11px] text-slate-400">
            {walletName} • {tx.time}
          </p>
        </div>
        <p className={`text-sm font-semibold shrink-0 ${isIncome ? "text-emerald-600" : "text-slate-800"}`}>
          {isIncome ? "+" : "-"}
          {rupiah(tx.amount)}
        </p>
      </div>
      {!isTransfer && (
        <button
          onClick={() => onToggle(tx.id)}
          aria-label="Ubah status transaksi"
          className={`mt-2 flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-300 active:scale-95 ${
            biz ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          <span className="flex items-center gap-1.5">
            {biz ? <Briefcase size={13} /> : <User size={13} />}
            {biz ? "💼 Omzet Jualan" : "👤 Uang Pribadi"}
          </span>
          <span className="flex items-center gap-1 opacity-70">
            Ubah <ArrowLeftRight size={12} />
          </span>
        </button>
      )}
    </li>
  );
}

function TxList({
  txs,
  wallets,
  onToggle,
  limit,
}: {
  txs: Tx[];
  wallets: Wallet[];
  onToggle: (id: string | number) => void;
  limit?: number;
}) {
  const [filter, setFilter] = useState<"ALL" | Scope>("ALL");
  const list = txs
    .filter((t) => filter === "ALL" || t.scope === filter || (t.kind === "transfer" && filter === "ALL"))
    .slice(0, limit);
  const tabs: { id: "ALL" | Scope; label: string }[] = [
    { id: "ALL", label: "Semua" },
    { id: "BUSINESS", label: "Omzet" },
    { id: "PERSONAL", label: "Pribadi" },
  ];

  return (
    <section>
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-slate-700">Riwayat transaksi</h2>
        <div className="flex rounded-full bg-slate-200/70 p-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                filter === t.id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <ul className="space-y-2">
        {list.map((t) => (
          <TxRow
            key={t.id}
            tx={t}
            onToggle={onToggle}
            walletName={wallets.find((w) => w.id === t.walletId || w.slug === t.walletId)?.name ?? "Dompet"}
          />
        ))}
        {list.length === 0 && (
          <li className="rounded-2xl bg-white p-6 text-center text-sm text-slate-400">
            Belum ada transaksi di kategori ini.
          </li>
        )}
      </ul>
    </section>
  );
}

/* ───────────── Transfer Bottom Sheet ───────────── */
function TransferSheet({
  open,
  wallets,
  onClose,
  onSubmit,
}: {
  open: boolean;
  wallets: Wallet[];
  onClose: () => void;
  onSubmit: (from: string, to: string, amount: number, fee: number) => void;
}) {
  const [from, setFrom] = useState(wallets[0]?.id || "bni");
  const [to, setTo] = useState(wallets[1]?.id || "dana");
  const [amount, setAmount] = useState("");
  const [fee, setFee] = useState("1500");

  const amt = Number(amount) || 0;
  const f = Number(fee) || 0;
  const src = wallets.find((w) => w.id === from);
  const error =
    from === to
      ? "Dompet asal dan tujuan tidak boleh sama."
      : amt <= 0
      ? ""
      : src && amt + f > src.balance
      ? "Saldo dompet asal tidak cukup."
      : "";
  const valid = amt > 0 && !error;

  const field =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10";

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`absolute bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 rounded-t-[28px] bg-white p-5 pb-8 shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">Transfer antar akun</h3>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-full bg-slate-100 p-2 text-slate-500 transition active:scale-90"
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-slate-500">
              Dari
              <select value={from} onChange={(e) => setFrom(e.target.value)} className={`${field} mt-1`}>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-500">
              Ke
              <select value={to} onChange={(e) => setTo(e.target.value)} className={`${field} mt-1`}>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {src && (
            <p className="px-1 text-[11px] text-slate-400">
              Saldo {src.name}: {rupiah(src.balance)}
            </p>
          )}
          <label className="block text-xs font-medium text-slate-500">
            Nominal (Rp)
            <input
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
              className={`${field} mt-1 text-lg font-semibold`}
            />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            Biaya admin (Rp)
            <input
              inputMode="numeric"
              value={fee}
              onChange={(e) => setFee(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
              className={`${field} mt-1`}
            />
          </label>
          <div className="flex gap-2 rounded-2xl bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-100">
            <Info size={16} className="mt-0.5 shrink-0" />
            <p>
              Biaya admin otomatis dipotong dari dompet asal dan dicatat sebagai <b>Pengeluaran Pribadi</b> (Expense)
              kategori <b>“Biaya Admin”</b>.
            </p>
          </div>
          {error && <p className="px-1 text-xs font-medium text-red-500">{error}</p>}
          <button
            disabled={!valid}
            onClick={() => onSubmit(from, to, amt, f)}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/30 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            Transfer sekarang
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Bottom Nav ───────────── */
function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const items: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "analysis", label: "Analisis", icon: BarChart3 },
    { id: "transfer", label: "Transfer", icon: ArrowLeftRight },
    { id: "logs", label: "Logs", icon: ListChecks },
  ];
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-slate-200/70 bg-white/80 px-4 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-xl">
      <ul className="grid grid-cols-4">
        {items.map(({ id, label, icon: Icon }) => {
          const on = tab === id;
          return (
            <li key={id}>
              <button
                onClick={() => onChange(id)}
                className="group flex w-full flex-col items-center gap-0.5 py-1 transition active:scale-90"
              >
                <span
                  className={`grid h-8 w-12 place-items-center rounded-full transition-all duration-300 ${
                    on
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-teal-500/30"
                      : "text-slate-400 group-hover:text-slate-600"
                  }`}
                >
                  <Icon size={20} />
                </span>
                <span className={`text-[10px] font-medium ${on ? "text-teal-700" : "text-slate-400"}`}>{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ───────────── Page Component with Live Supabase Backend ───────────── */
export default function CaihematDashboard() {
  const [tab, setTab] = useState<Tab>("home");
  const [sheet, setSheet] = useState(false);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [rawLogs, setRawLogs] = useState<RawLog[]>([]);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  // Helper mapping kategori DB ke CategoryId UI
  const mapDbCategoryToId = (catName?: string): CategoryId | undefined => {
    const l = (catName || "").toLowerCase();
    if (l.includes("makan") || l.includes("minum") || l.includes("resto") || l.includes("cafe")) return "food";
    if (l.includes("transport") || l.includes("grab") || l.includes("gojek")) return "transport";
    if (l.includes("belanja") || l.includes("indomaret") || l.includes("toko")) return "shop";
    if (l.includes("admin")) return "admin";
    return undefined;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resWallets, resTx, resLogs] = await Promise.all([
        fetch("/api/wallets", { cache: "no-store" }),
        fetch("/api/transactions", { cache: "no-store" }),
        fetch("/api/raw-notifications", { cache: "no-store" }),
      ]);

      const dataWallets = await resWallets.json();
      const dataTx = await resTx.json();
      const dataLogs = await resLogs.json();

      if (dataWallets.success && dataWallets.data?.length > 0) {
        setWallets(
          dataWallets.data.map((w: any) => ({
            id: w.id,
            name: w.name,
            slug: w.slug,
            balance: Number(w.balance || 0),
            gradient: WALLET_GRADIENTS[w.slug] || "from-slate-600 to-slate-800",
          }))
        );
      }

      if (dataTx.success && dataTx.data?.length > 0) {
        setTxs(
          dataTx.data.map((t: any) => ({
            id: t.id,
            title: t.description || (t.type === "TRANSFER" ? `Transfer ➔ ${t.destinationWallet?.name}` : t.category?.name || "Transaksi"),
            amount: Number(t.amount || 0),
            kind: t.type === "INCOME" ? "income" : t.type === "EXPENSE" ? "expense" : "transfer",
            scope: t.scope as Scope,
            category: mapDbCategoryToId(t.category?.name),
            categoryName: t.category?.name,
            walletId: t.walletId,
            time: new Date(t.transactionDate).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }),
          }))
        );
      }

      if (dataLogs.success && dataLogs.data) {
        setRawLogs(dataLogs.data);
      }
    } catch (err) {
      console.error("Fetch data error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const total = wallets.reduce((a, w) => a + w.balance, 0);
  const omzet = txs
    .filter((t) => t.kind === "income" && t.scope === "BUSINESS")
    .reduce((a, t) => a + t.amount, 0);
  const personal = txs
    .filter((t) => t.kind === "expense" && t.scope === "PERSONAL")
    .reduce((a, t) => a + t.amount, 0);

  // Live 1-Click Toggle Scope (Business ⇄ Personal) with Supabase Sync
  const toggleScope = async (id: string | number) => {
    const tx = txs.find((t) => t.id === id);
    if (!tx) return;
    const newScope: Scope = tx.scope === "BUSINESS" ? "PERSONAL" : "BUSINESS";
    const newCategoryName = newScope === "BUSINESS" ? "Penjualan QRIS" : "Uang Masuk Pribadi";

    // Optimistic UI update
    setTxs((p) => p.map((t) => (t.id === id ? { ...t, scope: newScope } : t)));

    try {
      await fetch("/api/transactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          scope: newScope,
          category_name: newCategoryName,
        }),
      });
      setToast(`Diubah ke: ${newScope === "BUSINESS" ? "Omzet Jualan 💼" : "Uang Pribadi 👤"}`);
      setTimeout(() => setToast(""), 2000);
      fetchData();
    } catch (e: any) {
      setToast("Gagal update status");
      setTimeout(() => setToast(""), 2000);
    }
  };

  const handleTab = (t: Tab) => {
    if (t === "transfer") setSheet(true);
    else setTab(t);
  };

  // Live Transfer Execution with Supabase Sync & Auto-Admin Expense
  const doTransfer = async (from: string, to: string, amount: number, fee: number) => {
    try {
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_wallet_id: from,
          destination_wallet_id: to,
          amount,
          admin_fee: fee,
          description: "Transfer Antar Akun",
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSheet(false);
        setToast("Transfer berhasil dicatat beserta biaya admin!");
        setTimeout(() => setToast(""), 2500);
        fetchData();
      } else {
        setToast(json.message || "Gagal transfer");
        setTimeout(() => setToast(""), 2500);
      }
    } catch (err: any) {
      setToast(err.message || "Gagal transfer");
      setTimeout(() => setToast(""), 2500);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-28 text-slate-800 antialiased">
      <style>{`
        @keyframes chRise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes chSplash{from{opacity:0;transform:scale(.6) rotate(-8deg)}to{opacity:1;transform:none}}
        @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
      `}</style>
      <Splash />

      <header className="flex items-center justify-between px-4 pb-3 pt-6">
        <div className="flex items-center gap-2.5">
          <CaihematLogo size={36} />
          <div>
            <p className="text-base font-bold leading-none tracking-tight text-slate-900">Caihemat</p>
            <p className="mt-1 text-[11px] leading-none text-slate-400">Personal & Business Tracker</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            title="Refresh Data"
            aria-label="Refresh"
            className="grid h-10 w-10 place-items-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-100 transition active:scale-90"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-teal-600" : ""} />
          </button>
          <button
            onClick={() => setSheet(true)}
            aria-label="Transfer"
            className="grid h-10 w-10 place-items-center rounded-full bg-white text-teal-600 shadow-sm ring-1 ring-slate-100 transition active:scale-90"
          >
            <ArrowLeftRight size={18} />
          </button>
        </div>
      </header>

      <main className="space-y-5 px-4">
        {tab === "home" && (
          <>
            <HeroCard total={total} omzet={omzet} personal={personal} />
            <WalletSlider wallets={wallets} />
            <DonutChart txs={txs} />
            <TxList txs={txs} wallets={wallets} onToggle={toggleScope} limit={5} />
          </>
        )}

        {tab === "analysis" && (
          <>
            <HeroCard total={total} omzet={omzet} personal={personal} />
            <DonutChart txs={txs} />
          </>
        )}

        {tab === "logs" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-slate-700">Webhook Logs Android</h2>
              <span className="text-[11px] font-semibold text-slate-400">{rawLogs.length} notifikasi</span>
            </div>

            {rawLogs.length === 0 ? (
              <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-400">
                Belum ada notifikasi webhook yang diterima dari MacroDroid.
              </div>
            ) : (
              <ul className="space-y-2">
                {rawLogs.map((log) => (
                  <li key={log.id} className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700">
                        <Smartphone size={11} /> {log.appName}
                      </span>
                      <span
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
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

                    <p className="text-xs font-semibold text-slate-800">{log.notificationTitle}</p>
                    <p className="text-[11px] font-mono bg-slate-50 p-2 rounded-lg text-slate-600 break-words">
                      &quot;{log.notificationText}&quot;
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      {log.parsedAmount ? (
                        <span className="text-emerald-600 font-bold">Terekstrak: {rupiah(log.parsedAmount)}</span>
                      ) : (
                        <span>Info webhook</span>
                      )}
                      <span>
                        {new Date(log.receivedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="pt-2">
              <TxList txs={txs} wallets={wallets} onToggle={toggleScope} />
            </div>
          </div>
        )}
      </main>

      {toast && (
        <div className="fixed left-1/2 top-6 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-xl animate-[chRise_.3s_both]">
          <Check size={14} className="text-emerald-400" />
          {toast}
        </div>
      )}

      <TransferSheet
        key={String(sheet)}
        open={sheet}
        wallets={wallets}
        onClose={() => setSheet(false)}
        onSubmit={doTransfer}
      />
      <BottomNav tab={sheet ? "transfer" : tab} onChange={handleTab} />
    </div>
  );
}
