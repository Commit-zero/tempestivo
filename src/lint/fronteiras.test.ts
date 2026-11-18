import path from "node:path";
import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

const raiz = path.resolve(__dirname, "../..");
const eslint = new ESLint({ cwd: raiz });

async function violacoes(codigo: string, arquivo: string): Promise<number> {
  const [resultado] = await eslint.lintText(codigo, { filePath: path.join(raiz, arquivo) });
  return resultado.messages.filter((m) => m.ruleId === "no-restricted-imports").length;
}

const importar = (origem: string) => `import { x } from "${origem}";\nexport { x };\n`;

describe("fronteiras entre módulos", () => {
  // Carregar a configuração e os plugins do ESLint leva dezenas de segundos numa máquina
  // fria (e mais com a cobertura ligada). Isso acontece uma vez, aqui, com prazo próprio,
  // e não conta no tempo do primeiro caso.
  beforeAll(async () => {
    await eslint.lintText("export {};\n", { filePath: path.join(raiz, "src/app/page.tsx") });
  }, 120_000);

  it.each(["src/app/page.tsx", "src/lib/util.ts", "src/platform/logger/x.ts"])(
    "%s não importa o interior de um módulo",
    async (arquivo) => {
      expect(await violacoes(importar("@/modules/prazos/servico"), arquivo)).toBe(1);
      expect(await violacoes(importar("@/modules/prazos"), arquivo)).toBe(0);
    },
  );

  it("importação relativa para o interior de um módulo, vinda de fora, falha", async () => {
    expect(await violacoes(importar("../modules/prazos/servico"), "src/app/page.tsx")).toBe(1);
    expect(await violacoes(importar("../../modules/prazos/servico"), "src/app/a/page.tsx")).toBe(1);
  });

  it("um módulo só entra em outro pelo index", async () => {
    const arquivo = "src/modules/prazos/servico.ts";
    expect(await violacoes(importar("@/modules/clientes/servico"), arquivo)).toBe(1);
    expect(await violacoes(importar("@/modules/clientes"), arquivo)).toBe(0);
  });

  it("importação relativa entre módulos diferentes falha", async () => {
    const arquivo = "src/modules/prazos/servico.ts";
    expect(await violacoes(importar("../clientes/servico"), arquivo)).toBe(1);
    expect(await violacoes(importar("../clientes"), arquivo)).toBe(1);
    expect(await violacoes(importar("../../modules/clientes/servico"), arquivo)).toBe(1);
    expect(await violacoes(importar("../../clientes/servico"), "src/modules/prazos/sub/a.ts")).toBe(1);
  });

  it("um módulo importa o próprio interior sem problema", async () => {
    const arquivo = "src/modules/prazos/servico.ts";
    expect(await violacoes(importar("./dominio"), arquivo)).toBe(0);
    expect(await violacoes(importar("@/modules/prazos/dominio"), arquivo)).toBe(0);
  });
});

describe("fronteira do banco", () => {
  it.each(["@prisma/client", "@/generated/prisma", "@/platform/database"])(
    "src/app não importa %s",
    async (origem) => {
      expect(await violacoes(importar(origem), "src/app/page.tsx")).toBe(1);
    },
  );

  it("módulos podem importar o banco", async () => {
    expect(await violacoes(importar("@/platform/database"), "src/modules/prazos/repo.ts")).toBe(0);
  });
});

describe("sem serviços exclusivos do Vercel", () => {
  it.each(["src/app/page.tsx", "src/modules/prazos/servico.ts", "src/platform/mailer/x.ts"])(
    "%s não importa @vercel/*",
    async (arquivo) => {
      expect(await violacoes(importar("@vercel/kv"), arquivo)).toBe(1);
      expect(await violacoes(importar("@vercel/blob"), arquivo)).toBe(1);
    },
  );
});
