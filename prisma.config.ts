import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// A CLI do Prisma 7 não carrega o .env sozinha; o Node faz isso sem dependência extra.
if (existsSync(".env")) process.loadEnvFile(".env");

// SHADOW_DATABASE_URL é opcional e só serve ao `migrate dev` em banco hospedado
// que não permite criar bancos. Nunca aponte para o mesmo banco de DATABASE_URL.
const sombra = process.env.SHADOW_DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env.DATABASE_URL,
    ...(sombra ? { shadowDatabaseUrl: sombra } : {}),
  },
});
