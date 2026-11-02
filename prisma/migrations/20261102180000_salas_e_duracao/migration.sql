-- Salas compartilhadas substituem a capacidade por experiência; a duração passa a ser escolhida na reserva.

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_number_key" ON "Room"("number");

-- As 4 salas fazem parte da estrutura do salão, não de dados de teste
INSERT INTO "Room" ("id", "number", "name") VALUES
    ('sala-1', 1, 'Sala 1'),
    ('sala-2', 2, 'Sala 2'),
    ('sala-3', 3, 'Sala 3'),
    ('sala-4', 4, 'Sala 4');

-- Reservas que já existem ficam na Sala 1 antes de a coluna virar obrigatória
ALTER TABLE "Booking" ADD COLUMN "roomId" TEXT;
UPDATE "Booking" SET "roomId" = 'sala-1';
ALTER TABLE "Booking" ALTER COLUMN "roomId" SET NOT NULL;

-- DropIndex
DROP INDEX "Booking_experienceId_startsAt_idx";
DROP INDEX "Booking_userId_idx";

-- AlterTable
ALTER TABLE "Experience" DROP COLUMN "capacity",
DROP COLUMN "durationMin";

-- CreateIndex
CREATE INDEX "Booking_roomId_startsAt_idx" ON "Booking"("roomId", "startsAt");
CREATE INDEX "Booking_userId_startsAt_idx" ON "Booking"("userId", "startsAt");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
