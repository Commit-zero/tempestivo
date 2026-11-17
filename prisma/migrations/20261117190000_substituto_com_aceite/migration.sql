-- AlterTable
ALTER TABLE "conta" ADD COLUMN     "substitutoConfirmadoEm" TIMESTAMP(3),
ADD COLUMN     "substitutoTokenExpiraEm" TIMESTAMP(3),
ADD COLUMN     "substitutoTokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "conta_substitutoTokenHash_key" ON "conta"("substitutoTokenHash");

