import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getConfig } from "@/platform/config";

export type { PrismaClient } from "@/generated/prisma/client";
export { Prisma } from "@/generated/prisma/client";

// Cliente Prisma único do processo. Fica em `globalThis` para sobreviver ao
// recarregamento de módulos do `next dev` sem abrir uma conexão nova a cada edição.
const global = globalThis as typeof globalThis & { __tempestivoPrisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  global.__tempestivoPrisma ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: getConfig().DATABASE_URL }),
  });
  return global.__tempestivoPrisma;
}
