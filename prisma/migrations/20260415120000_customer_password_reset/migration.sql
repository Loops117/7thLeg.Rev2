-- CreateTable
CREATE TABLE "customer_password_reset_tokens" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "customer_password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_password_reset_tokens_token_key" ON "customer_password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "customer_password_reset_tokens_customerId_idx" ON "customer_password_reset_tokens"("customerId");

-- AddForeignKey
ALTER TABLE "customer_password_reset_tokens" ADD CONSTRAINT "customer_password_reset_tokens_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
