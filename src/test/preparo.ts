import { existsSync } from "node:fs";

// Preparo dos testes: os de integração usam o Postgres do docker-compose (ou o
// `service` do CI). Só dados fictícios. Variáveis já definidas no ambiente vencem.
if (existsSync(".env")) process.loadEnvFile(".env");

process.env.APP_URL ??= "http://localhost:3000";
process.env.JOBS_SECRET ??= "segredo.falso.so.para.os.testes.0123456789";
process.env.AUTH_SECRET ??= "segredo.falso.de.sessao.so.para.os.testes.01";
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:54329/tempestivo";
process.env.MAILER_DRIVER = "fake";
