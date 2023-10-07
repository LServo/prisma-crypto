/*
  Warnings:

  - Added the required column `description` to the `calls_history` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_name` to the `calls_history` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "calls_history" ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "user_name" TEXT NOT NULL;
