import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { z } from "zod";
import { getPrisma } from "@/platform/database";
import { getConfig } from "@/platform/config";
import { getLogger, getMailer } from "@/platform/runtime";
import { getAuth } from "./auth";
import { criarLimitador } from "@/lib/limitador";
import { erroDaSenha } from "@/lib/regras-de-senha";
import { VERSAO_DOS_TERMOS } from "@/lib/termos";
import { enviarAvisoDeSeguranca } from "./avisos";
import { ipDoCliente, liberarEntrada, MUITAS_TENTATIVAS, permitirEntrada, registrarFalha } from "./comum";
import { invalidarPendenciasDaSenha } from "./pendencias-da-senha";
import { conferirSenha } from "./senha";

// Casos de uso de autenticação chamados pelas server actions das telas.
// Toda mensagem é genérica o bastante para não revelar se um e-mail tem cadastro.

export type ResultadoAuth = { ok: true } | { ok: false; erro: string };

const QUINZE_MINUTOS = 15 * 60 * 1000;
const tentativasDeCadastro = criarLimitador({ maximo: 10, janelaMs: QUINZE_MINUTOS });
const pedidosDeRedefinicao = criarLimitador({ maximo: 3, janelaMs: QUINZE_MINUTOS });

const ROTA_APOS_CONFIRMAR = "/email-confirmado";
const reenviosDeConfirmacao = criarLimitador({ maximo: 3, janelaMs: QUINZE_MINUTOS });

const email = z.email("Informe um e-mail válido.").trim().toLowerCase().max(254);
// Aqui só o formato; as regras da senha nova ficam em `erroDaSenhaNova`.
const senhaDigitada = z.string("Informe a senha.").max(1024, "A senha pode ter no máximo 128 caracteres.");
const confirmacaoDigitada = z.string("Confirme a senha.").max(1024, "As senhas não conferem.");

const schemaCadastro = z.object({
  // O nome vai para o corpo dos e-mails: sem quebra de linha, ninguém monta ali um texto falso.
  nome: z.string().trim().min(2, "Informe o seu nome.").max(120)
    .regex(/^[^\p{Cc}\p{Zl}\p{Zp}]*$/u, "O nome não pode ter quebras de linha."),
  email,
  senha: senhaDigitada,
  confirmacao: confirmacaoDigitada,
});
const schemaEntrada = z.object({ email, senha: z.string().min(1, "Informe a senha.").max(128) });
const schemaRedefinicao = z.object({
  token: z.string().min(1).max(512),
  senha: senhaDigitada,
  confirmacao: confirmacaoDigitada,
});
const LINK_INVALIDO = "O link de redefinição é inválido ou expirou. Peça um novo.";

/** Toda senha criada passa por aqui: no cadastro, na redefinição e na troca. */
function erroDaSenhaNova(senha: string, confirmacao: string, emailDoTitular: string): string | null {
  return erroDaSenha(senha, emailDoTitular) ?? (senha === confirmacao ? null : "As senhas não conferem.");
}

function primeiroErro(erro: z.ZodError): ResultadoAuth {
  return { ok: false, erro: erro.issues[0]?.message ?? "Dados inválidos." };
}

export async function cadastrar(dados: { nome: unknown; email: unknown; senha: unknown; confirmacao: unknown }): Promise<ResultadoAuth> {
  const validado = schemaCadastro.safeParse(dados);
  if (!validado.success) return primeiroErro(validado.error);
  const erroDeSenha = erroDaSenhaNova(validado.data.senha, validado.data.confirmacao, validado.data.email);
  if (erroDeSenha) return { ok: false, erro: erroDeSenha };
  if (!tentativasDeCadastro.permitir(await ipDoCliente())) return { ok: false, erro: MUITAS_TENTATIVAS };
  try {
    const { user } = await getAuth().api.signUpEmail({
      body: { name: validado.data.nome, email: validado.data.email, password: validado.data.senha, callbackURL: ROTA_APOS_CONFIRMAR },
    });
    // A conta nasce aqui com o aceite: data e versão dos termos que a pessoa leu.
    await getPrisma().conta.upsert({
      where: { usuarioId: user.id },
      update: { termosAceitosEm: new Date(), versaoDosTermos: VERSAO_DOS_TERMOS },
      create: { usuarioId: user.id, nome: user.name, termosAceitosEm: new Date(), versaoDosTermos: VERSAO_DOS_TERMOS },
    });
    return { ok: true };
  } catch (erro) {
    registrarFalha("cadastro", erro);
    return {
      ok: false,
      erro: "Não foi possível criar a conta com estes dados. Se você já tem cadastro, entre ou redefina a senha.",
    };
  }
}

/** `segundoFator`: a senha está certa, mas a sessão só nasce depois do código. */
export type ResultadoDaEntrada = ResultadoAuth | { ok: true; segundoFator: true };

export async function entrar(dados: { email: unknown; senha: unknown }): Promise<ResultadoDaEntrada> {
  const validado = schemaEntrada.safeParse(dados);
  if (!validado.success) return primeiroErro(validado.error);
  if (!(await permitirEntrada(validado.data.email))) return { ok: false, erro: MUITAS_TENTATIVAS };
  try {
    const resposta = await getAuth().api.signInEmail({ body: { email: validado.data.email, password: validado.data.senha } });
    if ("twoFactorRedirect" in resposta) return { ok: true, segundoFator: true };
    await liberarEntrada(validado.data.email);
    return { ok: true };
  } catch (erro) {
    registrarFalha("entrada", erro);
    return { ok: false, erro: "E-mail ou senha incorretos." };
  }
}

export async function sair(): Promise<void> {
  await getAuth().api.signOut({ headers: await headers() });
}

/** Sempre responde ok: a tela mostra a mesma mensagem com ou sem cadastro. */
export async function pedirRedefinicaoDeSenha(dados: { email: unknown }): Promise<ResultadoAuth> {
  const validado = z.object({ email }).safeParse(dados);
  if (!validado.success) return primeiroErro(validado.error);
  if (!pedidosDeRedefinicao.permitir(`${await ipDoCliente()}:${validado.data.email}`)) {
    return { ok: false, erro: MUITAS_TENTATIVAS };
  }
  try {
    await getAuth().api.requestPasswordReset({
      body: { email: validado.data.email, redirectTo: "/redefinir-senha" },
    });
  } catch (erro) {
    registrarFalha("pedido de redefinição", erro);
  }
  return { ok: true };
}

/**
 * E-mail de quem pediu o link, sem gastá-lo: a regra "sem o nome do e-mail" precisa
 * dele. O registro é o mesmo que o Better Auth consulta ao redefinir.
 */
async function emailDoLinkDeRedefinicao(token: string): Promise<string | null> {
  const { internalAdapter } = await getAuth().$context;
  const pedido = await internalAdapter.findVerificationValue(`reset-password:${token}`);
  if (!pedido || pedido.expiresAt < new Date()) return null;
  const usuario = await getPrisma().user.findUnique({ where: { id: pedido.value }, select: { email: true } });
  return usuario?.email ?? null;
}

export async function redefinirSenha(dados: { token: unknown; senha: unknown; confirmacao: unknown }): Promise<ResultadoAuth> {
  const validado = schemaRedefinicao.safeParse(dados);
  if (!validado.success) return primeiroErro(validado.error);
  try {
    const emailDoTitular = await emailDoLinkDeRedefinicao(validado.data.token);
    if (!emailDoTitular) return { ok: false, erro: LINK_INVALIDO };
    const erroDeSenha = erroDaSenhaNova(validado.data.senha, validado.data.confirmacao, emailDoTitular);
    if (erroDeSenha) return { ok: false, erro: erroDeSenha };
    await getAuth().api.resetPassword({ body: { token: validado.data.token, newPassword: validado.data.senha } });
    return { ok: true };
  } catch (erro) {
    registrarFalha("redefinição", erro);
    return { ok: false, erro: LINK_INVALIDO };
  }
}

const confirmacoesDeSenha = criarLimitador({ maximo: 5, janelaMs: QUINZE_MINUTOS });

/**
 * Confirma a senha de quem já está logado, antes de uma ação sem volta (excluir a
 * conta). Uma sessão esquecida aberta num computador compartilhado não basta.
 */
export async function confirmarSenhaAtual(usuarioId: string, senha: unknown): Promise<ResultadoAuth> {
  if (typeof senha !== "string" || senha.length === 0 || senha.length > 128) return { ok: false, erro: "Informe a sua senha." };
  if (!confirmacoesDeSenha.permitir(usuarioId)) return { ok: false, erro: MUITAS_TENTATIVAS };
  const conta = await getPrisma().account.findFirst({
    where: { userId: usuarioId, providerId: "credential" },
    select: { password: true },
  });
  if (!conta?.password || !(await conferirSenha({ hash: conta.password, password: senha }))) {
    return { ok: false, erro: "Senha incorreta." };
  }
  confirmacoesDeSenha.liberar(usuarioId);
  return { ok: true };
}

// Os dois contam também as trocas que dão certo e nunca são zerados: cada troca manda
// um e-mail, e o endereço pode não ser confirmado.
const trocasDeSenha = criarLimitador({ maximo: 5, janelaMs: QUINZE_MINUTOS });
const trocasDeSenhaNoDia = criarLimitador({ maximo: 10, janelaMs: 24 * 60 * 60 * 1000 });
const schemaTroca = z.object({
  senhaAtual: z.string("Informe a senha atual.").min(1, "Informe a senha atual.").max(128, "Senha atual incorreta."),
  senha: senhaDigitada,
  confirmacao: confirmacaoDigitada,
});

/** Troca a senha de quem está logado: mantém esta sessão e encerra as outras. */
export async function trocarSenha(
  titular: { usuarioId: string; nome: string; email: string },
  dados: { senhaAtual: unknown; senha: unknown; confirmacao: unknown },
): Promise<ResultadoAuth> {
  const validado = schemaTroca.safeParse(dados);
  if (!validado.success) return primeiroErro(validado.error);
  const erroDeSenha = erroDaSenhaNova(validado.data.senha, validado.data.confirmacao, titular.email);
  if (erroDeSenha) return { ok: false, erro: erroDeSenha };
  if (validado.data.senha === validado.data.senhaAtual) return { ok: false, erro: "A nova senha precisa ser diferente da atual." };
  if (!trocasDeSenha.permitir(titular.usuarioId) || !trocasDeSenhaNoDia.permitir(titular.usuarioId)) {
    return { ok: false, erro: MUITAS_TENTATIVAS };
  }
  try {
    await getAuth().api.changePassword({
      headers: await headers(),
      body: { currentPassword: validado.data.senhaAtual, newPassword: validado.data.senha, revokeOtherSessions: true },
    });
  } catch (erro) {
    registrarFalha("troca de senha", erro);
    if (erro instanceof APIError && erro.body?.code === "INVALID_PASSWORD") return { ok: false, erro: "Senha atual incorreta." };
    // A biblioteca não troca em uma transação só: não dá para garantir o que ficou valendo.
    // Na dúvida, o que estava aberto com a senha antiga deixa de valer.
    await invalidarPendenciasDaSenha(titular.usuarioId, getLogger());
    return {
      ok: false,
      erro: "Não foi possível confirmar a troca. Saia e entre de novo; se a senha atual não funcionar, tente a nova.",
    };
  }
  await invalidarPendenciasDaSenha(titular.usuarioId, getLogger());
  await enviarAvisoDeSeguranca("senha-alterada", titular, { mailer: getMailer(), logger: getLogger(), appUrl: getConfig().APP_URL });
  return { ok: true };
}

/** Reenvia o e-mail de confirmação para quem está logado e ainda não confirmou. */
export async function reenviarConfirmacaoDeEmail(sessao: { usuarioId: string; email: string }): Promise<ResultadoAuth> {
  if (!reenviosDeConfirmacao.permitir(sessao.usuarioId)) return { ok: false, erro: MUITAS_TENTATIVAS };
  try {
    await getAuth().api.sendVerificationEmail({ body: { email: sessao.email, callbackURL: ROTA_APOS_CONFIRMAR } });
    return { ok: true };
  } catch (erro) {
    registrarFalha("reenvio da confirmação", erro);
    return { ok: false, erro: "Não foi possível reenviar agora. Tente de novo mais tarde." };
  }
}
