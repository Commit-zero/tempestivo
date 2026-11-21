import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getConfig } from "@/platform/config";
import { semParametrosDeTls } from "./tls";

export type { PrismaClient } from "@/generated/prisma/client";
export { Prisma } from "@/generated/prisma/client";

// Cliente Prisma único do processo. Fica em `globalThis` para sobreviver ao
// recarregamento de módulos do `next dev` sem abrir uma conexão nova a cada edição.
const global = globalThis as typeof globalThis & { __tempestivoPrisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (!global.__tempestivoPrisma) {
    const { DATABASE_URL, DATABASE_POOL_MAX, DATABASE_CA_CERT } = getConfig();
    global.__tempestivoPrisma = new PrismaClient({
      adapter: new PrismaPg({
        // Com o certificado, o TLS é verificado de verdade e a URL perde os parâmetros de
        // TLS, que o sobrescreveriam. Variáveis de ambiente costumam achatar o PEM numa
        // linha só, com "\n" escrito: as quebras são restauradas aqui. Sem certificado, a
        // configuração só sobe em produção com banco local ou `sslmode=verify-full`.
        connectionString: DATABASE_CA_CERT ? semParametrosDeTls(DATABASE_URL) : DATABASE_URL,
        max: DATABASE_POOL_MAX,
        ...(DATABASE_CA_CERT ? { ssl: { ca: DATABASE_CA_CERT.replace(/\\n/g, "\n"), rejectUnauthorized: true } } : {}),
      }),
    });
  }
  return global.__tempestivoPrisma;
}
