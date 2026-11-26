import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { renderSVG } from "uqr";
import { z } from "zod";
import { criarLimitador } from "@/lib/limitador";
import { getConfig } from "@/platform/config";
import { getPrisma } from "@/platform/database";
import { getLogger, getMailer } from "@/platform/runtime";
import { getAuth } from "./auth";
import { enviarAvisoDeSeguranca, type AvisoDeSeguranca } from "./avisos";
import { MUITAS_TENTATIVAS, registrarFalha } from "./comum";
import { FORA_DO_FORMATO, registrarCodigoUsado, schemaDoCodigo } from "./segundo-fator";
import { cabecalhosComCookiesAtuais } from "./sessao";

// Ligar a verificação em duas etapas na tela Conta, em dois passos: a senha mostra a
// chave; um código válido do aplicativo liga e entrega os códigos de recuperação.

export type Titular = { usuarioId: string; nome: string; email: string };
export type InicioDaAtivacao = { ok: true; qrCode: string; chave: string; endereco: string } | { ok: false; erro: string };
export type FimDaAtivacao = { ok: true; codigos: string[]; atencao?: string } | { ok: false; erro: string };

const QUINZE_MINUTOS = 15 * 60 * 1000;
const senhasNaAtivacao = criarLimitador({ maximo: 5, janelaMs: QUINZE_MINUTOS });
// Com a sessão aberta, o Better Auth não conta os erros: o limite é este.
const codigosNaAtivacao = criarLimitador({ maximo: 10, janelaMs: QUINZE_MINUTOS });

const JA_LIGADA = "A verificação em duas etapas já está ligada.";
const RECOMECAR = "Comece de novo: digite a sua senha.";
const schemaDaSenha = z.string("Informe a sua senha.").min(1, "Informe a sua senha.").max(128, "Senha incorreta.");

/** Lido do banco, não da sessão: vale o estado de agora. */
async function situacao(usuarioId: string) {
  return getPrisma().user.findUnique({ where: { id: usuarioId }, select: { emailVerified: true, twoFactorEnabled: true } });
}

export async function segundoFatorLigado(usuarioId: string): Promise<boolean> {
  return Boolean((await situacao(usuarioId))?.twoFactorEnabled);
}

// O e-mail confirmado é exigido porque é por ele que a pessoa recebe os avisos e
// recupera o acesso; também fecha o login por um link de confirmação pendente.
async function impedimento(usuarioId: string): Promise<string | null> {
  const atual = await situacao(usuarioId);
  if (atual?.twoFactorEnabled) return JA_LIGADA;
  if (!atual?.emailVerified) return "Confirme o seu e-mail antes de ligar a verificação em duas etapas.";
  return null;
}

export async function iniciarAtivacao(titular: Titular, senha: unknown): Promise<InicioDaAtivacao> {
  const validada = schemaDaSenha.safeParse(senha);
  if (!validada.success) return { ok: false, erro: validada.error.issues[0]?.message ?? "Informe a sua senha." };
  const erro = await impedimento(titular.usuarioId);
  if (erro) return { ok: false, erro };
  if (!senhasNaAtivacao.permitir(titular.usuarioId)) return { ok: false, erro: MUITAS_TENTATIVAS };
  try {
    const resposta = await getAuth().api.enableTwoFactor({ body: { password: validada.data }, headers: await headers() });
    if (!("totpURI" in resposta)) throw new Error("A biblioteca não devolveu a chave.");
    const chave = new URL(resposta.totpURI).searchParams.get("secret");
    if (!chave) throw new Error("O endereço do autenticador veio sem a chave.");
    // O QR code é desenhado aqui: a chave nunca vai para um serviço de terceiros.
    // Os códigos de recuperação da resposta só são mostrados depois da confirmação.
    const qrCode = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderSVG(resposta.totpURI, { border: 4 }))}`;
    return { ok: true, qrCode, chave, endereco: resposta.totpURI };
  } catch (falha) {
    registrarFalha("início do segundo fator", falha);
    if (falha instanceof APIError && falha.body?.code === "INVALID_PASSWORD") return { ok: false, erro: "Senha incorreta." };
    return { ok: false, erro: "Não foi possível começar agora. Tente de novo." };
  }
}

/** Apaga as sessões abertas antes da proteção: elas nunca passaram pelo segundo fator. */
async function encerrarOutrasSessoes(usuarioId: string): Promise<void> {
  const atual = await getAuth().api.getSession({ headers: await cabecalhosComCookiesAtuais() });
  if (!atual) return;
  await getPrisma().session.deleteMany({ where: { userId: usuarioId, token: { not: atual.session.token } } });
}

export async function confirmarAtivacao(titular: Titular, codigo: unknown): Promise<FimDaAtivacao> {
  const validado = schemaDoCodigo.safeParse(codigo);
  if (!validado.success) return { ok: false, erro: FORA_DO_FORMATO };
  // Já ligada, não se confirma de novo: isso mostraria os códigos de recuperação.
  const erro = await impedimento(titular.usuarioId);
  if (erro) return { ok: false, erro };
  if ((await getPrisma().twoFactor.count({ where: { userId: titular.usuarioId } })) === 0) return { ok: false, erro: RECOMECAR };
  if (!codigosNaAtivacao.permitir(titular.usuarioId)) return { ok: false, erro: MUITAS_TENTATIVAS };
  try {
    await getAuth().api.verifyTOTP({ body: { code: validado.data }, headers: await headers() });
  } catch (falha) {
    registrarFalha("confirmação do segundo fator", falha);
    if (falha instanceof APIError && falha.body?.code === "INVALID_CODE") return { ok: false, erro: "Código incorreto." };
    return { ok: false, erro: "Não foi possível conferir o código. Tente de novo." };
  }
  // Daqui em diante a proteção está ligada: uma falha não pode passar em silêncio.
  const registrar = (falha: unknown) =>
    getLogger().error("falha depois de ligar o segundo fator", { tipo: falha instanceof Error ? falha.name : typeof falha });
  await registrarCodigoUsado(titular.usuarioId, validado.data).catch(registrar);
  let atencao: string | undefined;
  try {
    await encerrarOutrasSessoes(titular.usuarioId);
  } catch (falha) {
    registrar(falha);
    atencao = "Não foi possível encerrar as sessões em outros aparelhos. Troque a senha para encerrá-las.";
  }
  await avisar("segundo-fator-ligado", titular);
  try {
    // Função só de servidor da biblioteca; o id vem da sessão, nunca do navegador.
    const { backupCodes } = await getAuth().api.viewBackupCodes({ body: { userId: titular.usuarioId } });
    return { ok: true, codigos: backupCodes, atencao };
  } catch (falha) {
    registrar(falha);
    return { ok: false, erro: "A verificação foi ligada, mas não deu para mostrar os códigos de recuperação. Gere códigos novos abaixo." };
  }
}

// --- Com a proteção ligada --------------------------------------------------------

// Não é zerado quando dá certo: cada ação manda um e-mail.
const senhasNaGestao = criarLimitador({ maximo: 5, janelaMs: QUINZE_MINUTOS });
const DESLIGADA = "A verificação em duas etapas não está ligada.";

/** A senha atual é pedida de novo: uma sessão esquecida aberta não mexe na proteção. */
async function comSenha<T>(
  operacao: string,
  titular: Titular,
  senha: unknown,
  acao: (senha: string) => Promise<T>,
): Promise<{ ok: true; valor: T } | { ok: false; erro: string }> {
  const validada = schemaDaSenha.safeParse(senha);
  if (!validada.success) return { ok: false, erro: validada.error.issues[0]?.message ?? "Informe a sua senha." };
  if (!(await segundoFatorLigado(titular.usuarioId))) return { ok: false, erro: DESLIGADA };
  if (!senhasNaGestao.permitir(titular.usuarioId)) return { ok: false, erro: MUITAS_TENTATIVAS };
  try {
    return { ok: true, valor: await acao(validada.data) };
  } catch (falha) {
    registrarFalha(operacao, falha);
    if (falha instanceof APIError && falha.body?.code === "INVALID_PASSWORD") return { ok: false, erro: "Senha incorreta." };
    return { ok: false, erro: "Não foi possível concluir agora. Tente de novo." };
  }
}

const avisar = (aviso: AvisoDeSeguranca, titular: Titular) =>
  enviarAvisoDeSeguranca(aviso, titular, { mailer: getMailer(), logger: getLogger(), appUrl: getConfig().APP_URL });

export async function gerarNovosCodigos(titular: Titular, senha: unknown): Promise<FimDaAtivacao> {
  const resultado = await comSenha("códigos novos", titular, senha, async (password) =>
    getAuth().api.generateBackupCodes({ body: { password }, headers: await headers() }),
  );
  if (!resultado.ok) return resultado;
  await avisar("codigos-gerados", titular);
  return { ok: true, codigos: resultado.valor.backupCodes };
}

export async function desativarSegundoFator(titular: Titular, senha: unknown): Promise<{ ok: true } | { ok: false; erro: string }> {
  const resultado = await comSenha("desativação do segundo fator", titular, senha, async (password) =>
    getAuth().api.disableTwoFactor({ body: { password }, headers: await headers() }),
  );
  if (!resultado.ok) return resultado;
  await avisar("segundo-fator-desligado", titular);
  return { ok: true };
}
