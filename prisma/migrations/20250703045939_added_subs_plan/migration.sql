-- CreateEnum
CREATE TYPE "SubscriptionPlanEnum" AS ENUM ('BASIC', 'PREMIUM', 'ENTERPRISE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "subPlan" "SubscriptionPlanEnum" DEFAULT 'BASIC';
