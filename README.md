# Caihemat - Personal & Business Finance Tracker

Aplikasi web modern untuk pencatatan keuangan pribadi sekaligus omzet jualan UMKM dengan pemisahan kas tegas, transfer antar e-wallet dengan auto-admin expense, serta integrasi webhook notifikasi Android (DANA & ShopeePay).

---

## 🚀 Fitur Utama
1. **Pemisahan Saldo & Arus Kas:** Scope `PERSONAL` vs `BUSINESS` (Omzet Jualan QRIS).
2. **Transfer Antar Akun & Rekonsiliasi Admin:** Transfer antar dompet (misal BNI ke DANA) otomatis mencatat biaya admin (Rp1.000 - Rp2.000) sebagai pengeluaran (*expense*), menjaga saldo riil selalu akurat.
3. **Webhook Notifikasi HP Android (DANA & Shopee):** Endpoint `POST /api/webhook/notification` dengan Regex Parser otomatis untuk mencatat omzet QRIS masuk ke dompet tujuan.
4. **Log Mentah & Debugger:** Halaman `/logs` untuk memantau semua notifikasi Android mentah, status parsing (`PARSED`, `IGNORED`, `FAILED`), dan alasan penolakan jika ada.

---

## 📦 Setup Database Supabase (Cukup 1x Klik)
1. Buka project Anda di [Supabase Dashboard](https://supabase.com/dashboard).
2. Di menu sebelah kiri, klik ikon **SQL Editor** (`>_`).
3. Klik **New query**, lalu salin seluruh isi file [`supabase_setup.sql`](./supabase_setup.sql) dan klik tombol hijau **Run**.
4. Semua tabel (`wallets`, `categories`, `transactions`, `raw_notifications`) dan data dompet (BNI, DANA, GoPay, ShopeePay, OVO) akan langsung dibuat secara otomatis!

---

## 🌐 Deploy ke Vercel (Gratis 100%)
1. Buat repository baru di [GitHub](https://github.com/new) dan upload folder ini.
2. Buka [Vercel](https://vercel.com) -> Login dengan GitHub.
3. Klik **Add New Project** -> Pilih repository `financ3`.
4. Di bagian **Environment Variables**, tambahkan:
   - `DATABASE_URL`: URL transaksi pooler Supabase Anda
   - `DIRECT_URL`: URL session migration Supabase Anda
   - `WEBHOOK_API_KEY`: `financ3_secret_key_8148` (atau kata sandi yang Anda tentukan)
5. Klik **Deploy**! Website Anda akan langsung online dengan domain `https://financ3-xxx.vercel.app`.

---

## 📱 Panduan MacroDroid / Tasker di HP Android

Buat **Macro Baru** di aplikasi MacroDroid:
- **Trigger:**
  - `Notification Received` -> Pilih aplikasi **DANA** dan **Shopee**.
- **Action:**
  - `HTTP Request`
  - **Request Method:** `POST`
  - **URL:** `https://domain-anda.vercel.app/api/webhook/notification`
  - **Headers:**
    - `Content-Type: application/json`
    - `x-api-key: financ3_secret_key_8148`
  - **Request Body (JSON):**
    ```json
    {
      "app_name": "{notification_app_name}",
      "notification_title": "{notification_title}",
      "notification_text": "{notification_text}",
      "timestamp": "{system_time_ms}"
    }
    ```
    *(Gunakan Magic Text bawaan MacroDroid untuk mengisi `{...}`)*.
