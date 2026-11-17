import { getPrisma } from "@/platform/database";

export type Conta = {
  id: string;
  nome: string;
  substitutoNome: string | null;
  substitutoEmail: string | null;
  substitutoConfirmadoEm: Date | null;
  criadoEm: Date;
  titular: { nome: string };
};

const campos = {
  id: true, nome: true, substitutoNome: true, substitutoEmail: true, substitutoConfirmadoEm: true, criadoEm: true,
  usuario: { select: { name: true } },
} as const;

function paraConta({ usuario, ...conta }: { usuario: { name: string } } & Omit<Conta, "titular">): Conta {
  return { ...conta, titular: { nome: usuario.name } };
}

export async function buscar(contaId: string): Promise<Conta | null> {
  const conta = await getPrisma().conta.findUnique({ where: { id: contaId }, select: campos });
  return conta ? paraConta(conta) : null;
}

export type DadosDaConta = {
  nome: string;
  substitutoNome: string | null;
  substitutoEmail: string | null;
  /** Presente quando o substituto mudou: zera o aceite e grava o convite novo. */
  convite?: { tokenHash: string | null; expiraEm: Date | null };
};

export async function atualizar(contaId: string, { convite, ...dados }: DadosDaConta): Promise<boolean> {
  const { count } = await getPrisma().conta.updateMany({
    where: { id: contaId },
    data: {
      ...dados,
      ...(convite
        ? { substitutoConfirmadoEm: null, substitutoTokenHash: convite.tokenHash, substitutoTokenExpiraEm: convite.expiraEm }
        : {}),
    },
  });
  return count === 1;
}

/** O token do convite é a credencial: leva a uma única conta, só para aceitar. */
export function buscarPeloConvite(tokenHash: string) {
  return getPrisma().conta.findUnique({
    where: { substitutoTokenHash: tokenHash },
    select: { id: true, substitutoTokenExpiraEm: true, substitutoNome: true, usuario: { select: { name: true } } },
  });
}

/** Aceita o convite uma vez só: o token some na mesma escrita. */
export async function aceitarConvite(contaId: string, tokenHash: string, em: Date): Promise<boolean> {
  const { count } = await getPrisma().conta.updateMany({
    where: { id: contaId, substitutoTokenHash: tokenHash, substitutoTokenExpiraEm: { gt: em } },
    data: { substitutoConfirmadoEm: em, substitutoTokenHash: null, substitutoTokenExpiraEm: null },
  });
  return count === 1;
}

/**
 * Tudo o que a conta guarda, para a exportação (portabilidade, LGPD art. 18, V).
 * Cada tabela é lida com o filtro da conta. Ficam de fora o hash da senha, os tokens
 * das sessões e os resumos de token dos alertas e do convite.
 */
export async function exportar(contaId: string) {
  const prisma = getPrisma();
  const daConta = { where: { contaId } } as const;
  const semConta = { contaId: true } as const;
  const [conta, clientes, processos, prazos, conferencias, historico, tiposDePrazo, diasSemExpediente, audiencias, honorarios, parcelas, tarefas, sessoes, alertas] =
    await Promise.all([
      prisma.conta.findUnique({
        where: { id: contaId },
        select: {
          nome: true, substitutoNome: true, substitutoEmail: true, substitutoConfirmadoEm: true, termosAceitosEm: true, versaoDosTermos: true,
          criadoEm: true, usuario: { select: { name: true, email: true, emailVerified: true } },
        },
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
      prisma.session.findMany({
        where: { user: { conta: { id: contaId } } },
        select: { createdAt: true, expiresAt: true, ipAddress: true, userAgent: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.alerta.findMany({
        ...daConta,
        select: { prazoId: true, camada: true, destino: true, criadoEm: true, enviadoEm: true, tokenUsadoEm: true },
        orderBy: { criadoEm: "desc" },
      }),
    ]);
  return {
    conta, clientes, processos, prazos, conferencias, historico, tiposDePrazo, diasSemExpediente, audiencias, honorarios, parcelas, tarefas,
    sessoes, alertas,
  };
}

/** Apaga o usuário e, em cascata, a conta, as sessões e todos os dados. Não tem volta. */
export async function excluirTudo(contaId: string, usuarioId: string): Promise<boolean> {
  const { count } = await getPrisma().user.deleteMany({ where: { id: usuarioId, conta: { id: contaId } } });
  return count === 1;
}
