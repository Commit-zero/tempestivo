-- CreateEnum
CREATE TYPE "StatusProcesso" AS ENUM ('ativo', 'arquivado');

-- CreateEnum
CREATE TYPE "Contagem" AS ENUM ('uteis', 'corridos');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('intimacao', 'disponibilizacao', 'publicacao', 'intimacao_tacita');

-- CreateEnum
CREATE TYPE "OrigemDataFinal" AS ENUM ('calculada', 'manual');

-- CreateEnum
CREATE TYPE "StatusPrazo" AS ENUM ('pendente', 'confirmado', 'cumprido');

-- CreateEnum
CREATE TYPE "CanalConferencia" AS ENUM ('app', 'email');

-- CreateEnum
CREATE TYPE "DestinoAlerta" AS ENUM ('titular', 'substituto');

-- CreateEnum
CREATE TYPE "ColunaTarefa" AS ENUM ('a_fazer', 'fazendo', 'feito');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conta" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "substitutoNome" TEXT,
    "substitutoEmail" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente" (
    "id" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processo" (
    "id" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "tribunal" TEXT NOT NULL,
    "vara" TEXT,
    "assunto" TEXT NOT NULL,
    "parteContraria" TEXT,
    "status" "StatusProcesso" NOT NULL DEFAULT 'ativo',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prazo" (
    "id" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "dias" INTEGER,
    "contagem" "Contagem",
    "emDobro" BOOLEAN NOT NULL DEFAULT false,
    "tipoEvento" "TipoEvento",
    "dataEvento" CHAR(10),
    "dataInicio" CHAR(10),
    "dataFinal" CHAR(10) NOT NULL,
    "origemDataFinal" "OrigemDataFinal" NOT NULL,
    "memoriaDoCalculo" JSONB,
    "status" "StatusPrazo" NOT NULL DEFAULT 'pendente',
    "ultimaConferenciaEm" TIMESTAMP(3),
    "cumpridoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prazo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prazo_conferencia" (
    "id" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "prazoId" TEXT NOT NULL,
    "em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "via" "CanalConferencia" NOT NULL,
    "usuarioId" TEXT,

    CONSTRAINT "prazo_conferencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prazo_historico" (
    "id" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "prazoId" TEXT NOT NULL,
    "em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campo" TEXT NOT NULL,
    "valorAnterior" TEXT,
    "valorNovo" TEXT,

    CONSTRAINT "prazo_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipo_de_prazo" (
    "id" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "chaveBase" TEXT,
    "nome" TEXT NOT NULL,
    "dias" INTEGER NOT NULL,
    "contagem" "Contagem" NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipo_de_prazo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dia_sem_expediente" (
    "id" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "tribunal" TEXT NOT NULL,
    "data" CHAR(10) NOT NULL,
    "motivo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dia_sem_expediente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerta" (
    "id" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "prazoId" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "camada" TEXT NOT NULL,
    "destino" "DestinoAlerta" NOT NULL,
    "enviadoEm" TIMESTAMP(3),
    "tokenHash" TEXT,
    "tokenExpiraEm" TIMESTAMP(3),
    "tokenUsadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audiencia" (
    "id" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "duracaoMin" INTEGER NOT NULL DEFAULT 60,
    "local" TEXT,
    "linkVirtual" TEXT,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audiencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "honorario" (
    "id" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "processoId" TEXT,
    "descricao" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "honorario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcela" (
    "id" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "honorarioId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "vencimento" CHAR(10) NOT NULL,
    "pagaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parcela_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarefa" (
    "id" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "processoId" TEXT,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "coluna" "ColunaTarefa" NOT NULL DEFAULT 'a_fazer',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "limite" CHAR(10),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tarefa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "conta_usuarioId_key" ON "conta"("usuarioId");

-- CreateIndex
CREATE INDEX "cliente_contaId_nome_idx" ON "cliente"("contaId", "nome");

-- CreateIndex
CREATE INDEX "processo_contaId_status_idx" ON "processo"("contaId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "processo_contaId_numero_key" ON "processo"("contaId", "numero");

-- CreateIndex
CREATE INDEX "prazo_contaId_status_dataFinal_idx" ON "prazo"("contaId", "status", "dataFinal");

-- CreateIndex
CREATE INDEX "prazo_contaId_processoId_idx" ON "prazo"("contaId", "processoId");

-- CreateIndex
CREATE INDEX "prazo_conferencia_contaId_prazoId_idx" ON "prazo_conferencia"("contaId", "prazoId");

-- CreateIndex
CREATE INDEX "prazo_historico_contaId_prazoId_idx" ON "prazo_historico"("contaId", "prazoId");

-- CreateIndex
CREATE INDEX "tipo_de_prazo_contaId_idx" ON "tipo_de_prazo"("contaId");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_de_prazo_contaId_chaveBase_key" ON "tipo_de_prazo"("contaId", "chaveBase");

-- CreateIndex
CREATE UNIQUE INDEX "dia_sem_expediente_contaId_tribunal_data_key" ON "dia_sem_expediente"("contaId", "tribunal", "data");

-- CreateIndex
CREATE UNIQUE INDEX "alerta_chave_key" ON "alerta"("chave");

-- CreateIndex
CREATE UNIQUE INDEX "alerta_tokenHash_key" ON "alerta"("tokenHash");

-- CreateIndex
CREATE INDEX "alerta_contaId_prazoId_idx" ON "alerta"("contaId", "prazoId");

-- CreateIndex
CREATE INDEX "audiencia_contaId_inicio_idx" ON "audiencia"("contaId", "inicio");

-- CreateIndex
CREATE INDEX "honorario_contaId_clienteId_idx" ON "honorario"("contaId", "clienteId");

-- CreateIndex
CREATE INDEX "parcela_contaId_pagaEm_vencimento_idx" ON "parcela"("contaId", "pagaEm", "vencimento");

-- CreateIndex
CREATE UNIQUE INDEX "parcela_honorarioId_numero_key" ON "parcela"("honorarioId", "numero");

-- CreateIndex
CREATE INDEX "tarefa_contaId_coluna_ordem_idx" ON "tarefa"("contaId", "coluna", "ordem");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conta" ADD CONSTRAINT "conta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "conta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processo" ADD CONSTRAINT "processo_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "conta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processo" ADD CONSTRAINT "processo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prazo" ADD CONSTRAINT "prazo_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "conta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prazo" ADD CONSTRAINT "prazo_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prazo_conferencia" ADD CONSTRAINT "prazo_conferencia_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "conta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prazo_conferencia" ADD CONSTRAINT "prazo_conferencia_prazoId_fkey" FOREIGN KEY ("prazoId") REFERENCES "prazo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prazo_historico" ADD CONSTRAINT "prazo_historico_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "conta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prazo_historico" ADD CONSTRAINT "prazo_historico_prazoId_fkey" FOREIGN KEY ("prazoId") REFERENCES "prazo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipo_de_prazo" ADD CONSTRAINT "tipo_de_prazo_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "conta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dia_sem_expediente" ADD CONSTRAINT "dia_sem_expediente_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "conta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta" ADD CONSTRAINT "alerta_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "conta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta" ADD CONSTRAINT "alerta_prazoId_fkey" FOREIGN KEY ("prazoId") REFERENCES "prazo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audiencia" ADD CONSTRAINT "audiencia_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "conta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audiencia" ADD CONSTRAINT "audiencia_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "honorario" ADD CONSTRAINT "honorario_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "conta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "honorario" ADD CONSTRAINT "honorario_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "honorario" ADD CONSTRAINT "honorario_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcela" ADD CONSTRAINT "parcela_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "conta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcela" ADD CONSTRAINT "parcela_honorarioId_fkey" FOREIGN KEY ("honorarioId") REFERENCES "honorario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefa" ADD CONSTRAINT "tarefa_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "conta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefa" ADD CONSTRAINT "tarefa_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
