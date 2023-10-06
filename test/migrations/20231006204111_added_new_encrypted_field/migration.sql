/*
  Warnings:

  - Made the column `callsHistoryId` on table `calls` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `mobile_carrier` to the `cell_phone` table without a default value. This is not possible if the table is not empty.
  - Made the column `callId` on table `cellphone_calls` required. This step will fail if there are existing NULL values in that column.
  - Made the column `cellphoneId` on table `cellphone_calls` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "calls" DROP CONSTRAINT "calls_callsHistoryId_fkey";

-- AlterTable
ALTER TABLE "calls" ALTER COLUMN "callsHistoryId" SET NOT NULL;

-- AlterTable
ALTER TABLE "cell_phone" ADD COLUMN     "mobile_carrier" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "cellphone_calls" ALTER COLUMN "callId" SET NOT NULL,
ALTER COLUMN "cellphoneId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_callsHistoryId_fkey" FOREIGN KEY ("callsHistoryId") REFERENCES "calls_history"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
