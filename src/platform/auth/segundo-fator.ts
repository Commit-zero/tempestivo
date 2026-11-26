import { createHash } from "node:crypto";
import { APIError } from "better-auth/api";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { criarLimitador } from "@/lib/limitador";
import { getPrisma } from "@/platform/database";
import { getConfig } from "@/platform/config";
import { getLogger, getMailer } from "@/platform/runtime";
import { getAuth } from "./auth";
import { enviarAvisoDeSeguranca } from "./avisos";
import { ipDoCliente, MUITAS_TENTATIVAS, registrarFalha } from "./comum";

// Verificação em duas etapas por aplicativo autenticador (plugin `twoFactor`).
// Depois da senha certa, o Better Auth não cria sessão: guarda um passo pendente
// num cookie (10 minutos, 5 tentativas). O bloqueio por 10 erros seguidos fica no
// banco. `trustDevice` nunca é enviado: o código é pedido em todo login.

/** O passo pendente acabou, e só a senha começa outro. A tela de entrada mostra o motivo. */
export const MOTIVOS_DE_RECOMECO = {
  expirado: "O tempo para digitar o código acabou. Entre de novo com a senha.",
  tentativas: "Foram muitas tentativas. Entre de novo com a senha.",
  bloqueado: "Muitos códigos errados. Aguarde 15 minutos e entre de novo.",
  repetido: "Este código já foi usado. Espere o aplicativo mostrar o próximo e entre de novo.",
} as const;
export type MotivoDeRecomeco = keyof typeof MOTIVOS_DE_RECOMECO;

export type ResultadoDoSegundoFator = { ok: true } | { ok: false; erro: string; recomecar?: MotivoDeRecomeco };

const recomeco = (motivo: MotivoDeRecomeco): ResultadoDoSegundoFator => ({
  ok: false, recomecar: motivo, erro: MOTIVOS_DE_RECOMECO[motivo],
});

const QUINZE_MINUTOS = 15 * 60 * 1000;
const DOIS_MINUTOS = 2 * 60 * 1000;
const tentativasDeCodigo = criarLimitador({ maximo: 15, janelaMs: QUINZE_MINUTOS });

const FORA_DO_FORMATO = "Digite os 6 números do aplicativo.";
const schemaDoCodigo = z.string(FORA_DO_FORMATO).transform((valor) => valor.replace(/\s/g, "")).pipe(z.string().regex(/^\d{6}$/, FORA_DO_FORMATO));
const SEM_RECUPERACAO = "Digite um dos códigos de recuperação.";
// Os códigos têm letras maiúsculas e minúsculas: não se muda a caixa.
const schemaDaRecuperacao = z.string(SEM_RECUPERACAO).trim().min(1, SEM_RECUPERACAO).max(32, "Código de recuperação incorreto ou já usado.");

const ERROS: Record<string, ResultadoDoSegundoFator> = {
  INVALID_CODE: { ok: false, erro: "Código incorreto." },
  INVALID_BACKUP_CODE: { ok: false, erro: "Código de recuperação incorreto ou já usado." },
  INVALID_TWO_FACTOR_COOKIE: recomeco("expirado"),
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: recomeco("tentativas"),
  ACCOUNT_TEMPORARILY_LOCKED: recomeco("bloqueado"),
};

function traduzir(operacao: string, erro: unknown): ResultadoDoSegundoFator {
  registrarFalha(operacao, erro);
  const codigo = erro instanceof APIError ? erro.body?.code : undefined;
  return (codigo && ERROS[codigo]) || { ok: false, erro: "Não foi possível conferir o código. Tente de novo." };
}

/** Há uma senha já aceita esperando o código? Só confere o cookie, sem validá-lo. */
export async function haPassoPendente(): Promise<boolean> {
  const { name } = (await getAuth().$context).createAuthCookie("two_factor");
  return Boolean((await cookies()).get(name)?.value);
}

/**
 * Marca um código do aplicativo como usado. A biblioteca aceita o mesmo código
 * enquanto ele vale (cerca de 90 segundos); a chave primária garante que só o
 * primeiro envio vence, inclusive entre instâncias do servidor.
 */
export async function registrarCodigoUsado(usuarioId: string, codigo: string, agora = new Date()): Promise<boolean> {
  const identifier = `totp-usado:${usuarioId}`;
  const id = createHash("sha256").update(`${identifier}:${codigo}`).digest("base64url");
  const { verification } = getPrisma();
  await verification.deleteMany({ where: { identifier, expiresAt: { lt: agora } } });
  const { count } = await verification.createMany({
    data: [{ id, identifier, value: "usado", expiresAt: new Date(agora.getTime() + DOIS_MINUTOS) }],
    skipDuplicates: true,
  });
  return count === 1;
}

export async function confirmarCodigoDeEntrada(codigo: unknown): Promise<ResultadoDoSegundoFator> {
  const validado = schemaDoCodigo.safeParse(codigo);
  if (!validado.success) return { ok: false, erro: FORA_DO_FORMATO };
  if (!tentativasDeCodigo.permitir(await ipDoCliente())) return { ok: false, erro: MUITAS_TENTATIVAS };
  let entrada: { token: string; user: { id: string } };
  try {
    entrada = await getAuth().api.verifyTOTP({ body: { code: validado.data }, headers: await headers() });
  } catch (erro) {
    return traduzir("código de entrada", erro);
  }
  // Só aqui se sabe de quem é o código. Na dúvida (repetido ou banco falhando), a
  // sessão recém-criada é apagada.
  let primeiroUso = false;
  try {
    primeiroUso = await registrarCodigoUsado(entrada.user.id, validado.data);
  } catch (erro) {
    registrarFalha("registro do código usado", erro);
  }
  if (primeiroUso) return { ok: true };
  await getPrisma().session.deleteMany({ where: { token: entrada.token } });
  return recomeco("repetido");
}

export async function confirmarCodigoDeRecuperacao(codigo: unknown): Promise<ResultadoDoSegundoFator> {
  const validado = schemaDaRecuperacao.safeParse(codigo);
  if (!validado.success) return { ok: false, erro: validado.error.issues[0]?.message ?? SEM_RECUPERACAO };
  if (!tentativasDeCodigo.permitir(await ipDoCliente())) return { ok: false, erro: MUITAS_TENTATIVAS };
  let titular: { name: string; email: string };
  try {
    ({ user: titular } = await getAuth().api.verifyBackupCode({ body: { code: validado.data }, headers: await headers() }) as {
      user: { name: string; email: string };
    });
  } catch (erro) {
    return traduzir("código de recuperação", erro);
  }
  await enviarAvisoDeSeguranca("codigo-usado", { nome: titular.name, email: titular.email }, {
    mailer: getMailer(), logger: getLogger(), appUrl: getConfig().APP_URL,
  });
  return { ok: true };
}
