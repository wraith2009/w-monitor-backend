-- CreateEnum
CREATE TYPE "StatusEnum" AS ENUM ('UP', 'PAUSED', 'DOWN');

-- AlterTable
ALTER TABLE "Monitor" ADD COLUMN     "status" "StatusEnum";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isEmailVerified" BOOLEAN;
