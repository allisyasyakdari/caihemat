import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Scope, TransactionType, NotificationStatus } from "@prisma/client";

const WEBHOOK_API_KEY = process.env.WEBHOOK_API_KEY || "financ3_secret_key_8148";

interface NotificationPayload {
  app_name: string;
  notification_title: string;
  notification_text: string;
  timestamp?: number | string;
}

interface ParseResult {
  isSuccess: boolean;
  isIgnored?: boolean;
  amount?: number;
  walletSlug?: string;
  reason?: string;
}

/**
 * Text & Regex Parser untuk notifikasi masuk dari DANA & Shopee / ShopeePay
 */
function parseNotification(appName: string, title: string, text: string): ParseResult {
  const normalizedApp = (appName || "").trim().toUpperCase();
  const fullContent = `${title || ""} ${text || ""}`.toLowerCase();

  // 1. Deteksi transaksi pengeluaran (outbound) agar TIDAK tercatat sebagai omzet
  const outboundKeywords = [
    "berhasil kirim",
    "pembayaran ke",
    "kamu telah membayar",
    "transaksi berhasil di merchant",
    "pembelian pulsa berhasil",
    "tagihan berhasil dibayar",
    "transfer keluar",
    "tarik tunai",
  ];

  if (outboundKeywords.some((kw) => fullContent.includes(kw))) {
    return {
      isSuccess: false,
      isIgnored: true,
      reason: "Outbound payment detected. Ignored for revenue webhook.",
    };
  }

  // 2. Tentukan Dompet dan Pola Uang Masuk
  let walletSlug = "";
  let isIncomeMatch = false;

  if (normalizedApp.includes("DANA") || fullContent.includes("dana")) {
    walletSlug = "dana";
    const danaIncomeKeywords = [
      "pembayaran masuk",
      "pembayaran",
      "menerima",
      "saldo",
      "berhasil transfer ke kamu",
      "dana bisnis",
      "pembayaran qris",
      "terima uang",
      "masuk",
      "berhasil",
    ];
    isIncomeMatch = danaIncomeKeywords.some((kw) => fullContent.includes(kw));
  } else if (normalizedApp.includes("SHOPEE") || fullContent.includes("shopee") || fullContent.includes("spay")) {
    walletSlug = "shopeepay";
    const shopeeIncomeKeywords = [
      "pembayaran sebesar",
      "diterima",
      "qris",
      "berhasil diterima",
      "saldomu",
      "menerima",
      "transfer",
      "pembayaran",
      "dana sebesar",
      "isi saldo",
      "top up",
      "masuk",
      "berhasil",
    ];
    isIncomeMatch = shopeeIncomeKeywords.some((kw) => fullContent.includes(kw));
  } else if (normalizedApp.includes("GOPAY") || fullContent.includes("gopay")) {
    walletSlug = "gopay";
    const gopayIncomeKeywords = ["menerima", "masuk", "terima", "qris", "berhasil", "top up"];
    isIncomeMatch = gopayIncomeKeywords.some((kw) => fullContent.includes(kw));
  } else if (normalizedApp.includes("OVO") || fullContent.includes("ovo")) {
    walletSlug = "ovo";
    const ovoIncomeKeywords = ["top up", "transfer masuk", "menerima", "berhasil", "masuk"];
    isIncomeMatch = ovoIncomeKeywords.some((kw) => fullContent.includes(kw));
  } else {
    // Default fallback ke ShopeePay jika ada QRIS
    if (fullContent.includes("qris") || fullContent.includes("pembayaran")) {
      walletSlug = "shopeepay";
      isIncomeMatch = true;
    } else {
      return {
        isSuccess: false,
        isIgnored: true,
        reason: `Unsupported app name: ${appName}`,
      };
    }
  }

  if (!isIncomeMatch) {
    return {
      isSuccess: false,
      isIgnored: true,
      reason: "No incoming payment intent matched.",
    };
  }

  // 3. Regex Ekstraksi Nominal Rupiah (Mendukung dengan/tanpa tulisan "Rp")
  // Prioritas 1: Ada label Rp / IDR (misal: "Rp25.000", "Rp 50.000", "Rp. 150.000")
  let match = fullContent.match(/(?:rp\.?|idr)\s*([\d\.]+)(?:,\d{2})?/i);

  // Prioritas 2: Mengikuti kata "sebesar" (misal: "pembayaran sebesar 25.000 diterima")
  if (!match || !match[1]) {
    match = fullContent.match(/sebesar\s+([\d\.]+)(?:,\d{2})?/i);
  }

  // Prioritas 3: Pola angka ribuan dengan titik (misal: "pembayaran masuk 25.000")
  if (!match || !match[1]) {
    match = fullContent.match(/(?:pembayaran|masuk|terima|qris)\s+.*?([\d]{1,3}(?:\.[\d]{3})+)/i);
  }

  // Prioritas 4: Setiap angka format ribuan Indonesia (misal: 25.000, 100.000, 1.500.000)
  if (!match || !match[1]) {
    match = fullContent.match(/([\d]{1,3}(?:\.[\d]{3})+)/);
  }

  if (!match || !match[1]) {
    return {
      isSuccess: false,
      reason: "Gagal mengekstrak nominal uang dari teks notifikasi.",
    };
  }

  // Bersihkan pemisah ribuan titik (.)
  const cleanNumberStr = match[1].replace(/\./g, "");
  const parsedAmount = parseInt(cleanNumberStr, 10);

  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return {
      isSuccess: false,
      reason: `Nilai nominal tidak valid: ${cleanNumberStr}`,
    };
  }

  return {
    isSuccess: true,
    amount: parsedAmount,
    walletSlug,
  };
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verifikasi API Key
    const apiKey =
      req.headers.get("x-api-key") ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey || apiKey !== WEBHOOK_API_KEY) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Invalid or missing API Key" },
        { status: 401 }
      );
    }

    // 2. Baca Payload
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    const app_name = body.app_name || body.appName || "Unknown";
    const notification_title = body.notification_title || body.title || "";
    const notification_text = body.notification_text || body.text || body.message || "";
    const timestamp = body.timestamp;

    const receivedAtDate = timestamp ? new Date(Number(timestamp)) : new Date();

    // 3. Parsing Teks Notifikasi
    const parseResult = parseNotification(app_name, notification_title, notification_text);

    // 4. Eksekusi Database (Prisma Transaction)
    const result = await prisma.$transaction(async (tx) => {
      // Simpan log mentah terlebih dahulu agar SELALU terekam di /logs
      const rawLog = await tx.rawNotification.create({
        data: {
          appName: String(app_name),
          notificationTitle: String(notification_title),
          notificationText: String(notification_text || "(Pesan kosong)"),
          rawPayload: body,
          receivedAt: receivedAtDate,
          status: !notification_text
            ? NotificationStatus.FAILED
            : parseResult.isIgnored
            ? NotificationStatus.IGNORED
            : parseResult.isSuccess
            ? NotificationStatus.PARSED
            : NotificationStatus.FAILED,
          parsedAmount: parseResult.amount ? parseResult.amount : null,
          errorMessage: !notification_text ? "Notification text is empty" : parseResult.reason || null,
        },
      });

      // Jika diabaikan / parsing gagal, cukup simpan log mentah
      if (!parseResult.isSuccess || !parseResult.amount || !parseResult.walletSlug) {
        return { rawLog, transaction: null };
      }

      // Cari wallet target
      const wallet = await tx.wallet.findUnique({
        where: { slug: parseResult.walletSlug },
      });

      if (!wallet) {
        await tx.rawNotification.update({
          where: { id: rawLog.id },
          data: {
            status: NotificationStatus.FAILED,
            errorMessage: `Wallet '${parseResult.walletSlug}' not found in database.`,
          },
        });
        return { rawLog, transaction: null };
      }

      // Cari / buat kategori "Penjualan QRIS" (Scope: BUSINESS, Type: INCOME)
      let category = await tx.category.findFirst({
        where: {
          name: "Penjualan QRIS",
          scope: Scope.BUSINESS,
          type: TransactionType.INCOME,
        },
      });

      if (!category) {
        category = await tx.category.create({
          data: {
            name: "Penjualan QRIS",
            scope: Scope.BUSINESS,
            type: TransactionType.INCOME,
          },
        });
      }

      // Buat Transaksi Baru (Scope: BUSINESS, Type: INCOME)
      const newTransaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          categoryId: category.id,
          type: TransactionType.INCOME,
          scope: Scope.BUSINESS,
          amount: parseResult.amount,
          description: `Auto-recorded from ${app_name} QRIS: "${notification_text.substring(0, 100)}"`,
          transactionDate: receivedAtDate,
        },
      });

      // Update Saldo Wallet (Atomic Increment)
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            increment: parseResult.amount,
          },
        },
      });

      // Hubungkan log mentah ke transaksi
      await tx.rawNotification.update({
        where: { id: rawLog.id },
        data: {
          walletId: wallet.id,
          transactionId: newTransaction.id,
        },
      });

      return { rawLog, transaction: newTransaction };
    });

    return NextResponse.json(
      {
        success: true,
        message: parseResult.isSuccess
          ? "Transaction recorded successfully"
          : `Processed with status: ${parseResult.reason || "IGNORED"}`,
        data: {
          log_id: result.rawLog.id,
          transaction_id: result.transaction?.id || null,
          parsed_amount: parseResult.amount || null,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
