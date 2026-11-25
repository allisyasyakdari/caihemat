import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Scope, TransactionType, NotificationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const WEBHOOK_API_KEY = process.env.WEBHOOK_API_KEY || "financ3_secret_key_8148";

interface ParseResult {
  isSuccess: boolean;
  isIgnored?: boolean;
  amount?: number;
  walletSlug?: string;
  reason?: string;
  transactionType: TransactionType;
  categoryName: string;
  scope: Scope;
  description?: string;
}

/**
 * Smart Parser Engine untuk notifikasi Masuk & Keluar:
 * - Masuk: QRIS Omzet Jualan (BUSINESS) atau Transfer Masuk
 * - Keluar: Rumah Makan / Cafe -> "Makan & Minum", Grab/Gojek -> "Transportasi", Belanja -> "Belanja & Kebutuhan"
 */
function parseNotification(appName: string, title: string, text: string): ParseResult {
  const normalizedApp = (appName || "").trim().toUpperCase();
  const fullContent = `${title || ""} ${text || ""}`.toLowerCase();

  // 1. Tentukan Dompet (Wallet)
  let walletSlug = "dana";
  if (normalizedApp.includes("DANA") || fullContent.includes("dana")) {
    walletSlug = "dana";
  } else if (normalizedApp.includes("SHOPEE") || fullContent.includes("shopee") || fullContent.includes("spay")) {
    walletSlug = "shopeepay";
  } else if (normalizedApp.includes("GOPAY") || fullContent.includes("gopay") || fullContent.includes("gojek")) {
    walletSlug = "gopay";
  } else if (normalizedApp.includes("OVO") || fullContent.includes("ovo")) {
    walletSlug = "ovo";
  } else if (normalizedApp.includes("BNI") || fullContent.includes("bni") || fullContent.includes("wondr")) {
    walletSlug = "bni";
  }

  // 2. Deteksi Arah Transaksi: PENGELUARAN (OUTBOUND)
  const outboundKeywords = [
    "berhasil kirim",
    "pembayaran ke",
    "kamu telah membayar",
    "transaksi berhasil di merchant",
    "berhasil di",
    "pembelian pulsa berhasil",
    "tagihan berhasil dibayar",
    "transfer keluar",
    "tarik tunai",
    "pesanan selesai",
    "perjalanan selesai",
    "kamu telah menyelesaikan perjalanan",
    "telah membayar",
    "pembayaran berhasil",
  ];

  const isOutbound = outboundKeywords.some((kw) => fullContent.includes(kw));

  // 3. Deteksi Arah Transaksi: PEMASUKAN (INBOUND)
  const inboundKeywords = [
    "pembayaran masuk",
    "pembayaran sebesar",
    "diterima",
    "menerima pembayaran",
    "menerima saldo",
    "berhasil transfer ke kamu",
    "dana bisnis",
    "pembayaran qris",
    "terima uang",
    "masuk",
    "telah ditambahkan ke saldomu",
    "transfer diterima",
  ];

  const isInbound = inboundKeywords.some((kw) => fullContent.includes(kw));

  // 4. Regex Ekstraksi Nominal Rupiah (Mendukung ada/tanpa Rp)
  let match = fullContent.match(/(?:rp\.?|idr)\s*([\d\.]+)(?:,\d{2})?/i);
  if (!match || !match[1]) {
    match = fullContent.match(/sebesar\s+([\d\.]+)(?:,\d{2})?/i);
  }
  if (!match || !match[1]) {
    match = fullContent.match(/(?:pembayaran|masuk|terima|qris|total)\s+.*?([\d]{1,3}(?:\.[\d]{3})+)/i);
  }
  if (!match || !match[1]) {
    match = fullContent.match(/([\d]{1,3}(?:\.[\d]{3})+)/);
  }

  if (!match || !match[1]) {
    return {
      isSuccess: false,
      isIgnored: true,
      reason: "Tidak ditemukan nominal uang (kemungkinan promo atau pesan info)",
      transactionType: TransactionType.EXPENSE,
      categoryName: "Lainnya",
      scope: Scope.PERSONAL,
    };
  }

  const cleanNumberStr = match[1].replace(/\./g, "");
  const parsedAmount = parseInt(cleanNumberStr, 10);

  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return {
      isSuccess: false,
      isIgnored: true,
      reason: `Nominal tidak valid: ${cleanNumberStr}`,
      transactionType: TransactionType.EXPENSE,
      categoryName: "Lainnya",
      scope: Scope.PERSONAL,
    };
  }

  // 5. Klasifikasi Kategori Otomatis
  // A. PENGELUARAN (EXPENSE - PERSONAL)
  if (isOutbound || (!isInbound && (fullContent.includes("grab") || fullContent.includes("gojek")))) {
    // A.1 Makan & Minum (F&B, Warung, Resto, Cafe, Bakso, Mie, dll)
    const foodKeywords = [
      "warung", "resto", "rumah makan", "rm ", "cafe", "kafe", "kopi", "coffee",
      "bakso", "mie ", "mieayam", "soto", "nasi", "kitchen", "dapur", "food",
      "mcd", "kfc", "burger", "pizza", "ayam", "geprek", "bebek", "seblak",
      "martabak", "roti", "boba", "tea", "teh", "kedai", "snack", "kantin",
      "jus", "juice", "steak", "angkringan", "pecel", "padang", "sate"
    ];
    if (foodKeywords.some((kw) => fullContent.includes(kw))) {
      return {
        isSuccess: true,
        amount: parsedAmount,
        walletSlug,
        transactionType: TransactionType.EXPENSE,
        categoryName: "Makan & Minum",
        scope: Scope.PERSONAL,
        description: `QRIS Makan & Minum: "${(title || text).substring(0, 80)}"`,
      };
    }

    // A.2 Transportasi (Grab, Gojek, Maxim, Ojol, Bensin, Parkir, KAI, dll)
    const transportKeywords = [
      "grab", "gojek", "goride", "gocar", "grabbike", "grabcar", "maxim",
      "indrive", "ojol", "transport", "parkir", "parking", "tol", "bensin",
      "spbu", "pertamina", "shell", "kai", "kereta", "mrt", "transjakarta"
    ];
    if (transportKeywords.some((kw) => fullContent.includes(kw))) {
      return {
        isSuccess: true,
        amount: parsedAmount,
        walletSlug,
        transactionType: TransactionType.EXPENSE,
        categoryName: "Transportasi",
        scope: Scope.PERSONAL,
        description: `Transportasi: "${(title || text).substring(0, 80)}"`,
      };
    }

    // A.3 Belanja & Kebutuhan (Indomaret, Alfamart, Toko, dll)
    const shoppingKeywords = ["indomaret", "alfamart", "alfamidi", "supermarket", "hypermart", "toko", "store", "mall"];
    if (shoppingKeywords.some((kw) => fullContent.includes(kw))) {
      return {
        isSuccess: true,
        amount: parsedAmount,
        walletSlug,
        transactionType: TransactionType.EXPENSE,
        categoryName: "Belanja & Kebutuhan",
        scope: Scope.PERSONAL,
        description: `Belanja: "${(title || text).substring(0, 80)}"`,
      };
    }

    // Default Outbound
    return {
      isSuccess: true,
      amount: parsedAmount,
      walletSlug,
      transactionType: TransactionType.EXPENSE,
      categoryName: "Pengeluaran Pribadi",
      scope: Scope.PERSONAL,
      description: `Pengeluaran: "${(title || text).substring(0, 80)}"`,
    };
  }

  // B. PEMASUKAN (INCOME - DEFAULT BUSINESS OMZET)
  if (isInbound) {
    return {
      isSuccess: true,
      amount: parsedAmount,
      walletSlug,
      transactionType: TransactionType.INCOME,
      categoryName: "Penjualan QRIS",
      scope: Scope.BUSINESS,
      description: `QRIS Masuk: "${(title || text).substring(0, 80)}"`,
    };
  }

  // C. Fallback Promo / Info Tidak Dikenal
  return {
    isSuccess: false,
    isIgnored: true,
    reason: "Pesan informasi atau promo diabaikan otomatis.",
    transactionType: TransactionType.EXPENSE,
    categoryName: "Lainnya",
    scope: Scope.PERSONAL,
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

    // 3. Parsing Notifikasi
    const parseResult = parseNotification(app_name, notification_title, notification_text);

    // 4. Eksekusi Database (Prisma Transaction)
    const result = await prisma.$transaction(async (tx) => {
      // Simpan log mentah terlebih dahulu
      const rawLog = await tx.rawNotification.create({
        data: {
          appName: String(app_name),
          notificationTitle: String(notification_title),
          notificationText: String(notification_text || "(Pesan kosong)"),
          rawPayload: body,
          receivedAt: receivedAtDate,
          status: parseResult.isIgnored
            ? NotificationStatus.IGNORED
            : parseResult.isSuccess
            ? NotificationStatus.PARSED
            : NotificationStatus.FAILED,
          parsedAmount: parseResult.amount ? parseResult.amount : null,
          errorMessage: parseResult.isIgnored ? parseResult.reason : parseResult.isSuccess ? null : parseResult.reason,
        },
      });

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
            errorMessage: `Wallet '${parseResult.walletSlug}' tidak ditemukan.`,
          },
        });
        return { rawLog, transaction: null };
      }

      // Cari atau buat Category sesuai klasifikasi otomatis
      let category = await tx.category.findFirst({
        where: {
          name: parseResult.categoryName,
          scope: parseResult.scope,
          type: parseResult.transactionType,
        },
      });

      if (!category) {
        category = await tx.category.create({
          data: {
            name: parseResult.categoryName,
            scope: parseResult.scope,
            type: parseResult.transactionType,
          },
        });
      }

      // Buat Transaksi Baru
      const newTransaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          categoryId: category.id,
          type: parseResult.transactionType,
          scope: parseResult.scope,
          amount: parseResult.amount,
          description: parseResult.description || `Auto-recorded from ${app_name}`,
          transactionDate: receivedAtDate,
        },
      });

      // Update Saldo Wallet (Atomic Increment / Decrement)
      if (parseResult.transactionType === TransactionType.INCOME) {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: parseResult.amount } },
        });
      } else {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: parseResult.amount } },
        });
      }

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
        message: parseResult.isSuccess ? "Transaksi berhasil dicatat" : parseResult.reason || "Notifikasi diabaikan",
        data: {
          log_id: result.rawLog.id,
          transaction_id: result.transaction?.id || null,
          parsed_amount: parseResult.amount || null,
          category: parseResult.categoryName,
          type: parseResult.transactionType,
          scope: parseResult.scope,
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
