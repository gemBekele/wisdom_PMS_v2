-- CreateTable
CREATE TABLE "transactions" (
    "_id" TEXT NOT NULL,
    "account_no" TEXT NOT NULL,
    "transaction_type" TEXT NOT NULL DEFAULT 'credit',
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "branch_code" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "transactions_account_no_transaction_date_idx" ON "transactions"("account_no", "transaction_date");

-- CreateIndex
CREATE INDEX "transactions_branch_code_transaction_date_idx" ON "transactions"("branch_code", "transaction_date");

-- CreateIndex
CREATE INDEX "transactions_transaction_date_idx" ON "transactions"("transaction_date");
