-- ========================================================
-- FINANC3 - DATABASE INITIALIZATION SCRIPT FOR SUPABASE
-- Run this script in Supabase SQL Editor (>_ icon on the left)
-- ========================================================

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE "WalletType" AS ENUM ('BANK', 'E_WALLET', 'CASH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "Scope" AS ENUM ('PERSONAL', 'BUSINESS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'PARSED', 'IGNORED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Wallets Table
CREATE TABLE IF NOT EXISTS "wallets" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "type" "WalletType" NOT NULL,
    "balance" DECIMAL(15, 2) NOT NULL DEFAULT 0,
    "account_number" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Categories Table
CREATE TABLE IF NOT EXISTS "categories" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "scope" "Scope" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "categories_name_scope_type_key" UNIQUE ("name", "scope", "type")
);

-- 4. Create Transactions Table
CREATE TABLE IF NOT EXISTS "transactions" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "wallet_id" TEXT NOT NULL,
    "destination_wallet_id" TEXT,
    "category_id" TEXT,
    "type" "TransactionType" NOT NULL,
    "scope" "Scope" NOT NULL DEFAULT 'PERSONAL',
    "amount" DECIMAL(15, 2) NOT NULL,
    "admin_fee" DECIMAL(15, 2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parent_transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "transactions_destination_wallet_id_fkey" FOREIGN KEY ("destination_wallet_id") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transactions_parent_transaction_id_fkey" FOREIGN KEY ("parent_transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 5. Create Raw Notifications Table
CREATE TABLE IF NOT EXISTS "raw_notifications" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "app_name" TEXT NOT NULL,
    "notification_title" TEXT NOT NULL,
    "notification_text" TEXT NOT NULL,
    "raw_payload" JSONB NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "parsed_amount" DECIMAL(15, 2),
    "error_message" TEXT,
    "wallet_id" TEXT,
    "transaction_id" TEXT UNIQUE,
    "received_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "raw_notifications_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "raw_notifications_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 6. Create Indexes
CREATE INDEX IF NOT EXISTS "transactions_transaction_date_idx" ON "transactions"("transaction_date");
CREATE INDEX IF NOT EXISTS "transactions_scope_idx" ON "transactions"("scope");
CREATE INDEX IF NOT EXISTS "transactions_type_idx" ON "transactions"("type");
CREATE INDEX IF NOT EXISTS "raw_notifications_status_idx" ON "raw_notifications"("status");

-- 7. Seed Default Wallets (BNI, DANA, GoPay, ShopeePay, OVO)
INSERT INTO "wallets" ("name", "slug", "type", "balance")
VALUES
    ('Bank BNI', 'bni', 'BANK', 0),
    ('DANA', 'dana', 'E_WALLET', 0),
    ('GoPay', 'gopay', 'E_WALLET', 0),
    ('ShopeePay', 'shopeepay', 'E_WALLET', 0),
    ('OVO', 'ovo', 'E_WALLET', 0)
ON CONFLICT ("slug") DO NOTHING;

-- 8. Seed Default Categories
INSERT INTO "categories" ("name", "scope", "type")
VALUES
    ('Penjualan QRIS', 'BUSINESS', 'INCOME'),
    ('Omzet Jualan', 'BUSINESS', 'INCOME'),
    ('Operasional Usaha', 'BUSINESS', 'EXPENSE'),
    ('Biaya Admin', 'PERSONAL', 'EXPENSE'),
    ('Kebutuhan Pribadi', 'PERSONAL', 'EXPENSE'),
    ('Makan & Minum', 'PERSONAL', 'EXPENSE'),
    ('Gaji / Pendapatan Lain', 'PERSONAL', 'INCOME')
ON CONFLICT ("name", "scope", "type") DO NOTHING;
