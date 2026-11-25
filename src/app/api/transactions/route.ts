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
      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet_id,
          categoryId: category_id || null,
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
