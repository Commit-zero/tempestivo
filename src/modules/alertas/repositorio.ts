import { getPrisma, Prisma } from "@/platform/database";

export type PrazoParaAlertar = {
  id: string;
  contaId: string;
  descricao: string;
  dataFinal: string;
  status: "pendente" | "confirmado";
  assuntoDoProcesso: string;
  titular: { nome: string; email: string };
  /** Só existe depois que o substituto aceitou o convite. */
  substituto: { nome: string | null; email: string } | null;
};

/**
 * Único ponto do sistema que lê prazos de todas as contas: é o job de alertas, que
 * roda sem usuário logado. Cada linha carrega o `contaId`, e toda escrita seguinte
 * é feita com ele.
 */
export async function listarPrazosParaAlertar(de: string, ate: string): Promise<PrazoParaAlertar[]> {
  const prazos = await getPrisma().prazo.findMany({
    // Só para quem confirmou o próprio e-mail: ninguém dispara alertas para o endereço de outra pessoa.
    where: {
      status: { not: "cumprido" }, dataFinal: { gte: de, lte: ate }, processo: { status: "ativo" },
      conta: { usuario: { emailVerified: true } },
    },
    select: {
      id: true, contaId: true, descricao: true, dataFinal: true, status: true,
      processo: { select: { assunto: true } },
      conta: {
        select: { substitutoNome: true, substitutoEmail: true, substitutoConfirmadoEm: true, usuario: { select: { name: true, email: true } } },
      },
    },
    orderBy: { dataFinal: "asc" },
  });
  // O Prisma carrega as relações em consultas separadas: se a conta foi excluída no meio
  // da leitura, o prazo volta sem processo ou sem conta. Ele é ignorado, e o job segue.
  const completos = prazos.filter((prazo) => prazo.processo !== null && prazo.conta?.usuario != null);
  return completos.map((prazo) => ({
    id: prazo.id,
    contaId: prazo.contaId,
    descricao: prazo.descricao,
    dataFinal: prazo.dataFinal,
    status: prazo.status as "pendente" | "confirmado",
    assuntoDoProcesso: prazo.processo.assunto,
    titular: { nome: prazo.conta.usuario.name, email: prazo.conta.usuario.email },
    substituto:
      prazo.conta.substitutoEmail && prazo.conta.substitutoConfirmadoEm
        ? { nome: prazo.conta.substitutoNome, email: prazo.conta.substitutoEmail }
        : null,
  }));
}

/** Alertas da conta reservados desde um instante, para o teto diário de envios. */
export function contarAlertasDesde(contaId: string, desde: Date): Promise<number> {
  return getPrisma().alerta.count({ where: { contaId, criadoEm: { gte: desde } } });
}

export type NovoAlerta = {
  prazoId: string;
  chave: string;
  camada: string;
  destino: "titular" | "substituto";
  tokenHash: string | null;
  tokenExpiraEm: Date | null;
};

/** Reserva o envio pela chave única. Devolve `null` se o alerta já existe (job repetido ou concorrente) ou se o prazo sumiu. */
export async function reservar(contaId: string, alerta: NovoAlerta): Promise<string | null> {
  try {
    const criado = await getPrisma().alerta.create({ data: { ...alerta, contaId }, select: { id: true } });
    return criado.id;
  } catch (erro) {
    // P2002: a chave já existe. P2003: o prazo ou a conta foi apagado depois da
    // listagem. Nos dois casos não há o que enviar, e o job segue com os demais.
    if (erro instanceof Prisma.PrismaClientKnownRequestError && (erro.code === "P2002" || erro.code === "P2003")) return null;
    throw erro;
  }
}

export async function marcarComoEnviado(contaId: string, id: string, em: Date): Promise<void> {
  await getPrisma().alerta.updateMany({ where: { id, contaId }, data: { enviadoEm: em } });
}

/** Desfaz a reserva quando o envio falha, para a próxima execução tentar de novo. */
export async function liberar(contaId: string, id: string): Promise<void> {
  await getPrisma().alerta.deleteMany({ where: { id, contaId, enviadoEm: null } });
}

export type AlertaDoToken = {
  id: string;
  contaId: string;
  prazoId: string;
  tokenExpiraEm: Date | null;
  tokenUsadoEm: Date | null;
  prazo: { descricao: string; dataFinal: string; status: string; assuntoDoProcesso: string };
};

/** O token do e-mail é a credencial: quem o tem chega a um único prazo de uma única conta. */
export async function buscarPeloToken(tokenHash: string): Promise<AlertaDoToken | null> {
  const alerta = await getPrisma().alerta.findUnique({
    where: { tokenHash },
    select: {
      id: true, contaId: true, prazoId: true, tokenExpiraEm: true, tokenUsadoEm: true,
      prazo: { select: { descricao: true, dataFinal: true, status: true, processo: { select: { assunto: true } } } },
    },
  });
  if (!alerta) return null;
  const { processo, ...prazo } = alerta.prazo;
  return { ...alerta, prazo: { ...prazo, assuntoDoProcesso: processo.assunto } };
}

/** Marca o token como usado só se ainda não foi: garante o uso único mesmo com dois cliques simultâneos. */
export async function consumirToken(contaId: string, id: string, em: Date): Promise<boolean> {
  const { count } = await getPrisma().alerta.updateMany({ where: { id, contaId, tokenUsadoEm: null }, data: { tokenUsadoEm: em } });
  return count === 1;
}
