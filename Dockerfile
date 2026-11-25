# syntax=docker/dockerfile:1
# Imagem portável do Tempestivo. Alvos:
#   runner    app em produção (Next standalone, sem root, sem CLI do Prisma)
#   migrator  só aplica migrações: `prisma migrate deploy`
# O app nunca roda migração ao subir.
# Tag e digest juntos: a tag documenta a versão, o digest garante a imagem exata.
# O Dependabot (ecossistema docker) propõe a atualização.
ARG NODE_VERSION=24.22.1-slim@sha256:be8204d4bd327363357f532187b752ff62759c31bedf98e9e18fc08c9cbd605c

FROM node:${NODE_VERSION} AS base
ENV NEXT_TELEMETRY_DISABLED=1
# O OpenSSL é exigido pelos motores do Prisma (generate e migrate); a imagem slim não o traz.
# apt e libapt-pkg6.0 entram na lista para receber a correção da CVE-2026-109518 (2.6.2),
# que a imagem base fixada acima ainda não traz.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl apt libapt-pkg6.0 \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@12.16.1 && npm cache clean --force
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_OUTPUT=standalone
RUN pnpm prisma generate && pnpm build

FROM base AS migrator
COPY --from=deps --chown=node:node /app ./
USER node
CMD ["pnpm", "prisma", "migrate", "deploy"]

FROM node:${NODE_VERSION} AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
# Correção da CVE-2026-109518. Pode sair quando a imagem base trouxer o apt 2.6.2 ou mais novo.
RUN apt-get update \
  && apt-get install -y --no-install-recommends --only-upgrade apt libapt-pkg6.0 \
  && rm -rf /var/lib/apt/lists/*
# npm e corepack não são usados em execução; removê-los tira da imagem as CVE deles.
RUN rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /opt/yarn-*
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "server.js"]
