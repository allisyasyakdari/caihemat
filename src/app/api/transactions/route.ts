import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Scope, TransactionType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") as Scope | null;
    const type = searchParams.get("type") as TransactionType | null;

    const where: any = {};
    if (scope) where.scope = scope;
    if (type) where.type = type;

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        wallet: true,
        destinationWallet: true,
        category: true,
      },
      orderBy: { transactionDate: "desc" },
      take: 100,
    });

    return NextResponse.json({ success: true, data: transactions });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      wallet_id,
      category_id,
      category_name,
      type,
      scope = Scope.PERSONAL,
      amount,
      description,
      transaction_date,
    } = body;

    if (!wallet_id || !type || !amount || Number(amount) <= 0) {
      return NextResponse.json(
        { success: false, message: "wallet_id, type, and valid amount are required" },
        { status: 400 }
      );
    }

    const txDate = transaction_date ? new Date(transaction_date) : new Date();

    const txResult = await prisma.$transaction(async (tx) => {
      let finalCategoryId = category_id;

      // Buat category jika belum ada
      if (!finalCategoryId && category_name) {
        let cat = await tx.category.findFirst({
          where: { name: category_name, scope: scope as Scope, type: type as TransactionType },
        });
        if (!cat) {
          cat = await tx.category.create({
            data: { name: category_name, scope: scope as Scope, type: type as TransactionType },
          });
        }
        finalCategoryId = cat.id;
      }

      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet_id,
          categoryId: finalCategoryId || null,
          type: type as TransactionType,
          scope: scope as Scope,
          amount: Number(amount),
          description: description || null,
          transactionDate: txDate,
        },
      });

      // Update Saldo Wallet
      if (type === TransactionType.INCOME) {
        await tx.wallet.update({
          where: { id: wallet_id },
          data: { balance: { increment: Number(amount) } },
        });
      } else if (type === TransactionType.EXPENSE) {
        await tx.wallet.update({
          where: { id: wallet_id },
          data: { balance: { decrement: Number(amount) } },
        });
      }

      return transaction;
    });

    return NextResponse.json({ success: true, data: txResult });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/**
 * PATCH: Ubah Scope Transaksi (BUSINESS ⇄ PERSONAL) atau Ganti Kategori
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, scope, category_name } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "Transaction ID is required" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findUnique({ where: { id }, include: { category: true } });
      if (!existing) throw new Error("Transaction not found");

      let newCategoryId = existing.categoryId;

      if (category_name) {
        const targetScope = scope || existing.scope;
        let cat = await tx.category.findFirst({
          where: { name: category_name, scope: targetScope, type: existing.type },
        });
        if (!cat) {
          cat = await tx.category.create({
            data: { name: category_name, scope: targetScope, type: existing.type },
          });
        }
        newCategoryId = cat.id;
      }

      return tx.transaction.update({
        where: { id },
        data: {
          scope: scope || existing.scope,
          categoryId: newCategoryId,
        },
        include: {
          wallet: true,
          destinationWallet: true,
          category: true,
        },
      });
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
