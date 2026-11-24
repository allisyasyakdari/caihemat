import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Scope, TransactionType } from "@prisma/client";

interface TransferBody {
  source_wallet_id: string;
  destination_wallet_id: string;
  amount: number;
  admin_fee?: number;
  description?: string;
  transaction_date?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: TransferBody = await req.json();
    const {
      source_wallet_id,
      destination_wallet_id,
      amount,
      admin_fee = 0,
      description = "Transfer Antar Akun",
      transaction_date,
    } = body;

    if (!source_wallet_id || !destination_wallet_id || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: "Valid source_wallet_id, destination_wallet_id, and amount are required" },
        { status: 400 }
      );
    }

    if (source_wallet_id === destination_wallet_id) {
      return NextResponse.json(
        { success: false, message: "Source and destination wallets cannot be the same" },
        { status: 400 }
      );
    }

    const txDate = transaction_date ? new Date(transaction_date) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Validasi saldo wallet sumber
      const sourceWallet = await tx.wallet.findUnique({
        where: { id: source_wallet_id },
      });
      const destWallet = await tx.wallet.findUnique({
        where: { id: destination_wallet_id },
      });

      if (!sourceWallet || !destWallet) {
        throw new Error("Source or destination wallet not found");
      }

      const totalDeduction = Number(amount) + Number(admin_fee);

      // 2. Buat Transaksi Transfer Utama
      const transferTx = await tx.transaction.create({
        data: {
          walletId: source_wallet_id,
          destinationWalletId: destination_wallet_id,
          type: TransactionType.TRANSFER,
          scope: Scope.PERSONAL,
          amount: amount,
          adminFee: admin_fee,
          description: description,
          transactionDate: txDate,
        },
      });

      // 3. Jika ada Biaya Admin, otomatis buat transaksi EXPENSE kategori 'Biaya Admin'
      let adminExpenseTx = null;
      if (admin_fee > 0) {
        let adminCategory = await tx.category.findFirst({
          where: {
            name: "Biaya Admin",
            scope: Scope.PERSONAL,
            type: TransactionType.EXPENSE,
          },
        });

        if (!adminCategory) {
          adminCategory = await tx.category.create({
            data: {
              name: "Biaya Admin",
              scope: Scope.PERSONAL,
              type: TransactionType.EXPENSE,
            },
          });
        }

        adminExpenseTx = await tx.transaction.create({
          data: {
            walletId: source_wallet_id,
            categoryId: adminCategory.id,
            type: TransactionType.EXPENSE,
            scope: Scope.PERSONAL,
            amount: admin_fee,
            description: `Biaya Admin Transfer ke ${destWallet.name}`,
            transactionDate: txDate,
            parentTransactionId: transferTx.id,
          },
        });
      }

      // 4. Update Saldo Wallet Sumber (Kurangi amount + admin_fee)
      await tx.wallet.update({
        where: { id: source_wallet_id },
        data: {
          balance: {
            decrement: totalDeduction,
          },
        },
      });

      // 5. Update Saldo Wallet Tujuan (Tambah amount)
      await tx.wallet.update({
        where: { id: destination_wallet_id },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      return { transferTx, adminExpenseTx };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Transfer completed and admin fee recorded as expense successfully",
        data: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Transfer error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to process transfer" },
      { status: 500 }
    );
  }
}
