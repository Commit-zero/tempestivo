import { getPrisma } from "@/platform/database";

export type Conta = { id: string; nome: string; substitutoNome: string | null; substitutoEmail: string | null; criadoEm: Date };

const campos = { id: true, nome: true, substitutoNome: true, substitutoEmail: true, criadoEm: true } as const;

export function buscar(contaId: string): Promise<Conta | null> {
  return getPrisma().conta.findUnique({ where: { id: contaId }, select: campos });
}

export async function atualizar(contaId: string, dados: Pick<Conta, "nome" | "substitutoNome" | "substitutoEmail">): Promise<boolean> {
  const { count } = await getPrisma().conta.updateMany({ where: { id: contaId }, data: dados });
  return count === 1;
}

/**
 * Tudo o que a conta guarda, para a exportação (portabilidade, LGPD art. 18, V).
 * Cada tabela é lida com o filtro da conta. Ficam de fora os dados de autenticação
 * (hash de senha, sessões) e os resumos de token dos alertas.
 */
export async function exportar(contaId: string) {
  const prisma = getPrisma();
  const daConta = { where: { contaId } } as const;
  const semConta = { contaId: true } as const;
  const [conta, clientes, processos, prazos, conferencias, historico, tiposDePrazo, diasSemExpediente, audiencias, honorarios, parcelas, tarefas] =
    await Promise.all([
      prisma.conta.findUnique({
        where: { id: contaId },
        select: { nome: true, substitutoNome: true, substitutoEmail: true, criadoEm: true, usuario: { select: { name: true, email: true } } },
      }),
      prisma.cliente.findMany({ ...daConta, omit: semConta }),
      prisma.processo.findMany({ ...daConta, omit: semConta }),
      prisma.prazo.findMany({ ...daConta, omit: semConta }),
      prisma.prazoConferencia.findMany({ ...daConta, omit: { ...semConta, usuarioId: true } }),
      prisma.prazoHistorico.findMany({ ...daConta, omit: semConta }),
      prisma.tipoDePrazo.findMany({ ...daConta, omit: semConta }),
      prisma.diaSemExpediente.findMany({ ...daConta, omit: semConta }),
      prisma.audiencia.findMany({ ...daConta, omit: semConta }),
      prisma.honorario.findMany({ ...daConta, omit: semConta }),
      prisma.parcela.findMany({ ...daConta, omit: semConta }),
      prisma.tarefa.findMany({ ...daConta, omit: semConta }),
    ]);
  return { conta, clientes, processos, prazos, conferencias, historico, tiposDePrazo, diasSemExpediente, audiencias, honorarios, parcelas, tarefas };
}

/** Apaga o usuário e, em cascata, a conta, as sessões e todos os dados. Não tem volta. */
export async function excluirTudo(contaId: string, usuarioId: string): Promise<boolean> {
  const { count } = await getPrisma().user.deleteMany({ where: { id: usuarioId, conta: { id: contaId } } });
  return count === 1;
}
