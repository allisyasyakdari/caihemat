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

  if (normalizedApp.includes("DANA")) {
    walletSlug = "dana";
    const danaIncomeKeywords = [
      "menerima pembayaran",
      "menerima saldo",
      "berhasil transfer ke kamu",
      "dana bisnis",
      "pembayaran qris berhasil",
      "terima uang",
    ];
    isIncomeMatch = danaIncomeKeywords.some((kw) => fullContent.includes(kw));
  } else if (normalizedApp.includes("SHOPEE")) {
    walletSlug = "shopeepay";
    const shopeeIncomeKeywords = [
      "qris berhasil diterima",
      "telah ditambahkan ke saldomu",
      "menerima transfer",
      "transfer diterima",
      "pembayaran berhasil diterima",
      "dana sebesar",
    ];
    isIncomeMatch = shopeeIncomeKeywords.some((kw) => fullContent.includes(kw));
  } else if (normalizedApp.includes("GOPAY")) {
    walletSlug = "gopay";
    const gopayIncomeKeywords = ["kamu menerima", "gopay masuk", "terima gopay", "qris berhasil"];
    isIncomeMatch = gopayIncomeKeywords.some((kw) => fullContent.includes(kw));
  } else if (normalizedApp.includes("OVO")) {
    walletSlug = "ovo";
    const ovoIncomeKeywords = ["top up berhasil", "transfer masuk", "kamu menerima"];
    isIncomeMatch = ovoIncomeKeywords.some((kw) => fullContent.includes(kw));
  } else {
    return {
      isSuccess: false,
      isIgnored: true,
      reason: `Unsupported app name: ${appName}`,
    };
  }

  if (!isIncomeMatch) {
    return {
      isSuccess: false,
      isIgnored: true,
      reason: "No incoming payment intent matched.",
    };
  }

  // 3. Regex Ekstraksi Nominal Rupiah
  // Contoh yang didukung: "Rp25.000", "Rp 50.000", "Rp. 150.000", "Rp25.000,00", "IDR 50.000"
  const rupiahRegex = /(?:rp\.?|idr)\s*([\d\.]+)(?:,\d{2})?/i;
  const match = fullContent.match(rupiahRegex);

  if (!match || !match[1]) {
    return {
      isSuccess: false,
      reason: "Failed to extract currency amount via regex.",
    };
  }

  // Bersihkan pemisah ribuan titik (.)
  const cleanNumberStr = match[1].replace(/\./g, "");
  const parsedAmount = parseInt(cleanNumberStr, 10);

  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return {
      isSuccess: false,
      reason: `Invalid parsed amount value: ${cleanNumberStr}`,
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
    const body: NotificationPayload = await req.json();
    const { app_name, notification_title, notification_text, timestamp } = body;

    if (!app_name || !notification_text) {
      return NextResponse.json(
        { success: false, message: "Bad Request: app_name and notification_text are required" },
        { status: 400 }
      );
    }

    const receivedAtDate = timestamp ? new Date(Number(timestamp)) : new Date();

    // 3. Parsing Teks Notifikasi
    const parseResult = parseNotification(app_name, notification_title, notification_text);

    // 4. Eksekusi Database (Prisma Transaction)
    const result = await prisma.$transaction(async (tx) => {
      // Simpan log mentah terlebih dahulu
      const rawLog = await tx.rawNotification.create({
        data: {
          appName: app_name,
          notificationTitle: notification_title || "",
          notificationText: notification_text,
          rawPayload: body as any,
          receivedAt: receivedAtDate,
          status: parseResult.isIgnored
            ? NotificationStatus.IGNORED
            : parseResult.isSuccess
            ? NotificationStatus.PARSED
            : NotificationStatus.FAILED,
          parsedAmount: parseResult.amount ? parseResult.amount : null,
          errorMessage: parseResult.reason || null,
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
