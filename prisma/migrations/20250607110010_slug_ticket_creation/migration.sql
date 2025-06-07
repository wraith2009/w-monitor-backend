-- CreateTable
CREATE TABLE "SlugTicket" (
    "id" SERIAL NOT NULL,
    "range_start" INTEGER NOT NULL,
    "range_end" INTEGER NOT NULL,
    "current_value" INTEGER NOT NULL,

    CONSTRAINT "SlugTicket_pkey" PRIMARY KEY ("id")
);
