import { headers } from "next/headers";
import { z } from "zod";
import { getPrisma } from "@/platform/database";
import { getLogger } from "@/platform/runtime";
import { getAuth, TAMANHO_MINIMO_DA_SENHA } from "./auth";
import { criarLimitador } from "./limite";
import { conferirSenha } from "./senha";

// Casos de uso de autenticação chamados pelas server actions das telas.
// Toda mensagem é genérica o bastante para não revelar se um e-mail tem cadastro.

export type ResultadoAuth = { ok: true } | { ok: false; erro: string };

const QUINZE_MINUTOS = 15 * 60 * 1000;
const tentativasDeEntrada = criarLimitador({ maximo: 5, janelaMs: QUINZE_MINUTOS });
const tentativasDeCadastro = criarLimitador({ maximo: 10, janelaMs: QUINZE_MINUTOS });
const pedidosDeRedefinicao = criarLimitador({ maximo: 3, janelaMs: QUINZE_MINUTOS });

const MUITAS_TENTATIVAS = "Muitas tentativas. Aguarde alguns minutos e tente de novo.";

const email = z.email("Informe um e-mail válido.").trim().toLowerCase().max(254);
const senhaNova = z
  .string()
  .min(TAMANHO_MINIMO_DA_SENHA, `A senha precisa ter pelo menos ${TAMANHO_MINIMO_DA_SENHA} caracteres.`)
  .max(128, "A senha pode ter no máximo 128 caracteres.");

const schemaCadastro = z.object({
  nome: z.string().trim().min(2, "Informe o seu nome.").max(120),
  email,
  senha: senhaNova,
});
const schemaEntrada = z.object({ email, senha: z.string().min(1, "Informe a senha.").max(128) });
const schemaRedefinicao = z.object({ token: z.string().min(1).max(512), senha: senhaNova });

function primeiroErro(erro: z.ZodError): ResultadoAuth {
  return { ok: false, erro: erro.issues[0]?.message ?? "Dados inválidos." };
}

async function ipDoCliente(): Promise<string> {
  const cabecalhos = await headers();
  return cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() || cabecalhos.get("x-real-ip") || "desconhecido";
}

function registrarFalha(operacao: string, erro: unknown): void {
  getLogger().warn("falha de autenticação", {
    operacao,
    tipo: erro instanceof Error ? erro.name : typeof erro,
  });
}

export async function cadastrar(dados: { nome: unknown; email: unknown; senha: unknown }): Promise<ResultadoAuth> {
  const validado = schemaCadastro.safeParse(dados);
  if (!validado.success) return primeiroErro(validado.error);
  if (!tentativasDeCadastro.permitir(await ipDoCliente())) return { ok: false, erro: MUITAS_TENTATIVAS };
  try {
    await getAuth().api.signUpEmail({
      body: { name: validado.data.nome, email: validado.data.email, password: validado.data.senha },
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

export async function entrar(dados: { email: unknown; senha: unknown }): Promise<ResultadoAuth> {
  const validado = schemaEntrada.safeParse(dados);
  if (!validado.success) return primeiroErro(validado.error);
  const chave = `${await ipDoCliente()}:${validado.data.email}`;
  if (!tentativasDeEntrada.permitir(chave)) return { ok: false, erro: MUITAS_TENTATIVAS };
  try {
    await getAuth().api.signInEmail({ body: { email: validado.data.email, password: validado.data.senha } });
    tentativasDeEntrada.liberar(chave);
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

export async function redefinirSenha(dados: { token: unknown; senha: unknown }): Promise<ResultadoAuth> {
  const validado = schemaRedefinicao.safeParse(dados);
  if (!validado.success) return primeiroErro(validado.error);
  try {
    await getAuth().api.resetPassword({ body: { token: validado.data.token, newPassword: validado.data.senha } });
    return { ok: true };
  } catch (erro) {
    registrarFalha("redefinição", erro);
    return { ok: false, erro: "O link de redefinição é inválido ou expirou. Peça um novo." };
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
