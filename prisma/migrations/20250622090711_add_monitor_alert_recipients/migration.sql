-- CreateTable
CREATE TABLE "MonitorAlertRecipient" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "monitorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonitorAlertRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonitorAlertRecipient_email_monitorId_key" ON "MonitorAlertRecipient"("email", "monitorId");

-- AddForeignKey
ALTER TABLE "MonitorAlertRecipient" ADD CONSTRAINT "MonitorAlertRecipient_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
