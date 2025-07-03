-- AlterTable
ALTER TABLE "Monitor" ALTER COLUMN "status" SET DEFAULT 'UP';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "verifiedEmailSent" TIMESTAMP(3);
