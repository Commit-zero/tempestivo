import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { criarLimitador } from "@/lib/limitador";
import { falha, primeiraMensagem, sucesso, type Resultado } from "@/lib/resultado";
import { textoOpcional } from "@/lib/validacao";
import type { Mailer } from "@/platform/mailer";
import * as repositorio from "./repositorio";
import type { Conta } from "./repositorio";

const schemaConta = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome da conta.").max(120, "Use no máximo 120 caracteres no nome."),
    substitutoNome: textoOpcional(120),
    substitutoEmail: textoOpcional(254)
      .refine((valor) => valor === null || z.email().safeParse(valor).success, "E-mail do substituto inválido.")
      .transform((valor) => valor?.toLowerCase() ?? null),
  })
  .refine((conta) => conta.substitutoNome === null || conta.substitutoEmail !== null, "Informe o e-mail do substituto.");

export function obterConta(contaId: string): Promise<Conta | null> {
  return repositorio.buscar(contaId);
}

const SETE_DIAS = 7 * 24 * 60 * 60 * 1000;
// Cada troca de substituto manda um convite: o limite impede usar o Tempestivo para
// disparar e-mails a terceiros.
const convitesPorConta = criarLimitador({ maximo: 3, janelaMs: 24 * 60 * 60 * 1000 });
const resumo = (token: string) => createHash("sha256").update(token).digest("hex");

export type DependenciasDoConvite = { mailer: Mailer; appUrl: string; agora?: Date };

function emailDoConvite(titular: string, substituto: string | null, link: string) {
  return {
    assunto: `${titular} indicou você como advogado substituto no Tempestivo`,
    texto: [
      substituto ? `Olá, ${substituto}.` : "Olá.",
      "",
      `${titular} usa o Tempestivo para controlar prazos processuais e indicou você como substituto.`,
      "Se aceitar, você receberá um e-mail quando um prazo chegar à véspera sem conferência, pedindo que entre em contato.",
      "Você não terá acesso a nenhum dado e pode deixar de receber os avisos a qualquer momento.",
      "",
      "Para aceitar, abra o link abaixo. Ele vale por 7 dias:",
      link,
      "",
      "Se você não conhece quem fez a indicação, ignore este e-mail: nenhum outro será enviado.",
    ].join("\n"),
  };
}

/**
 * Dados da conta e do substituto: o colega que recebe um e-mail quando um prazo
 * chega à véspera sem conferência. Ele não ganha acesso ao sistema e só recebe
 * avisos depois de aceitar o convite enviado ao e-mail dele.
 */
export async function atualizarConta(
  contaId: string,
  entrada: Record<"nome" | "substitutoNome" | "substitutoEmail", unknown>,
  { mailer, appUrl, agora = new Date() }: DependenciasDoConvite,
): Promise<Resultado<{ conviteEnviado: boolean }>> {
  const validado = schemaConta.safeParse(entrada);
  if (!validado.success) return falha(primeiraMensagem(validado.error));
  const atual = await repositorio.buscar(contaId);
  if (!atual) return falha("Conta não encontrada.");

  const novoEmail = validado.data.substitutoEmail;
  if (novoEmail === atual.substitutoEmail) {
    await repositorio.atualizar(contaId, validado.data);
    return sucesso({ conviteEnviado: false });
  }
  if (novoEmail === null) {
    await repositorio.atualizar(contaId, { ...validado.data, convite: { tokenHash: null, expiraEm: null } });
    return sucesso({ conviteEnviado: false });
  }
  if (!convitesPorConta.permitir(contaId)) {
    return falha("Você já trocou de substituto várias vezes hoje. Tente de novo amanhã.");
  }
  const token = randomBytes(32).toString("base64url");
  await repositorio.atualizar(contaId, {
    ...validado.data,
    convite: { tokenHash: resumo(token), expiraEm: new Date(agora.getTime() + SETE_DIAS) },
  });
  const email = emailDoConvite(atual.titular.nome, validado.data.substitutoNome, `${appUrl.replace(/\/$/, "")}/substituto/${token}`);
  try {
    await mailer.enviar({ para: novoEmail, assunto: email.assunto, texto: email.texto });
  } catch {
    return falha("Os dados foram salvos, mas o convite ao substituto não pôde ser enviado. Salve de novo mais tarde.");
  }
  return sucesso({ conviteEnviado: true });
}

export type ConviteDeSubstituto = { titular: string; substituto: string | null };

async function conviteValido(token: string, agora: Date) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const conta = await repositorio.buscarPeloConvite(resumo(token));
  if (!conta?.substitutoTokenExpiraEm || conta.substitutoTokenExpiraEm <= agora) return null;
  return conta;
}

/** O que a página do convite mostra. Abrir o link não aceita nada. */
export async function obterConviteDeSubstituto(token: string, agora = new Date()): Promise<ConviteDeSubstituto | null> {
  const conta = await conviteValido(token, agora);
  return conta ? { titular: conta.usuario.name, substituto: conta.substitutoNome } : null;
}

export async function aceitarConviteDeSubstituto(token: string, agora = new Date()): Promise<Resultado> {
  const conta = await conviteValido(token, agora);
  if (!conta) return falha("Este convite é inválido, expirou ou já foi aceito.");
  return (await repositorio.aceitarConvite(conta.id, resumo(token), agora)) ? sucesso() : falha("Este convite já foi aceito.");
}

export type ExportacaoDaConta = { geradoEm: string; formato: "tempestivo-exportacao-v1" } & Awaited<ReturnType<typeof repositorio.exportar>>;

/** Todos os dados da conta em um objeto só, pronto para virar um arquivo JSON. */
export async function exportarDadosDaConta(contaId: string, agora = new Date()): Promise<ExportacaoDaConta> {
  return { formato: "tempestivo-exportacao-v1", geradoEm: agora.toISOString(), ...(await repositorio.exportar(contaId)) };
}

/**
 * Exclusão definitiva da conta e de todos os dados (LGPD art. 18, VI). Quem chama
 * confirma antes a senha atual do titular: esta função não tem volta.
 */
export async function excluirConta(sessao: { contaId: string; usuarioId: string }): Promise<Resultado> {
  return (await repositorio.excluirTudo(sessao.contaId, sessao.usuarioId)) ? sucesso() : falha("Conta não encontrada.");
}

// --- Meta interna e agenda assinável ------------------------------------------------

export const MARGEM_MAXIMA = 10;

/** Quantos dias úteis antes do vencimento fica a meta interna de cada prazo. */
export async function definirMargemDeSeguranca(contaId: string, margem: unknown): Promise<Resultado> {
  const validado = z.coerce
    .number("Informe a quantidade de dias.")
    .int("Use um número inteiro de dias.")
    .min(0, "A margem não pode ser negativa.")
    .max(MARGEM_MAXIMA, `Use no máximo ${MARGEM_MAXIMA} dias úteis.`)
    .safeParse(margem);
  if (!validado.success) return falha(primeiraMensagem(validado.error));
  return (await repositorio.definirMargem(contaId, validado.data)) ? sucesso() : falha("Conta não encontrada.");
}

/**
 * Cria (ou troca) o link secreto da agenda e o devolve uma única vez: o banco guarda
 * só o resumo. Trocar o link desliga o anterior, que pode ter vazado.
 */
export async function ativarAgenda(contaId: string, agora = new Date()): Promise<Resultado<{ token: string }>> {
  const token = randomBytes(32).toString("base64url");
  return (await repositorio.definirAgenda(contaId, resumo(token), agora)) ? sucesso({ token }) : falha("Conta não encontrada.");
}

export async function desativarAgenda(contaId: string): Promise<Resultado> {
  return (await repositorio.definirAgenda(contaId, null, null)) ? sucesso() : falha("Conta não encontrada.");
}

/** A conta dona do link da agenda, ou `null` se o link é inválido ou foi trocado. */
export async function contaDaAgenda(token: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  return (await repositorio.buscarPelaAgenda(resumo(token)))?.id ?? null;
}
