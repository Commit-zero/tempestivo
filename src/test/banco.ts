import { randomUUID } from "node:crypto";
import { getPrisma } from "@/platform/database";

/** Cria um usuário e uma conta fictícios para um teste de integração. */
export async function criarContaDeTeste(nome = "Conta de Teste"): Promise<string> {
  const id = randomUUID();
  const conta = await getPrisma().conta.create({
    data: {
      nome,
      usuario: { create: { id, name: nome, email: `${id}@exemplo.test` } },
    },
    select: { id: true },
  });
  return conta.id;
}

/** Apaga a conta e, em cascata, tudo o que pertence a ela. */
export async function apagarContaDeTeste(contaId: string): Promise<void> {
  await getPrisma().user.deleteMany({ where: { conta: { id: contaId } } });
}
