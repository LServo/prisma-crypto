-- CreateTable
CREATE TABLE "calls" (
    "id" TEXT NOT NULL,
    "callsHistoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cellphone_calls" (
    "id" TEXT NOT NULL,
    "callId" TEXT,
    "cellphoneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cellphone_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calls_history" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calls_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_migrate_encryption" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT true,
    "add_encryption" TEXT[],
    "remove_encryption" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "_migrate_encryption_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_callsHistoryId_fkey" FOREIGN KEY ("callsHistoryId") REFERENCES "calls_history"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cellphone_calls" ADD CONSTRAINT "cellphone_calls_callId_fkey" FOREIGN KEY ("callId") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cellphone_calls" ADD CONSTRAINT "cellphone_calls_cellphoneId_fkey" FOREIGN KEY ("cellphoneId") REFERENCES "cell_phone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
