-- AlterTable
ALTER TABLE "conta" ADD COLUMN     "agendaAtivadaEm" TIMESTAMP(3),
ADD COLUMN     "agendaTokenHash" TEXT,
ADD COLUMN     "margemDeSegurancaDiasUteis" INTEGER NOT NULL DEFAULT 2;

-- CreateIndex
CREATE UNIQUE INDEX "conta_agendaTokenHash_key" ON "conta"("agendaTokenHash");

