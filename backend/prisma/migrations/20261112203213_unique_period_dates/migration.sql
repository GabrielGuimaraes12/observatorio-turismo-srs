/*
  Warnings:

  - A unique constraint covering the columns `[startDate,endDate]` on the table `Period` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Period_startDate_endDate_key" ON "Period"("startDate", "endDate");
