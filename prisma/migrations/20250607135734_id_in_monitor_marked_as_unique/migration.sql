/*
  Warnings:

  - A unique constraint covering the columns `[id]` on the table `Monitor` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Monitor_id_key" ON "Monitor"("id");
