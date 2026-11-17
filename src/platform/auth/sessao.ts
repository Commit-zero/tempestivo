import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getPrisma } from "@/platform/database";
import { getAuth } from "./auth";

export type Sessao = {
  usuarioId: string;
  contaId: string;
  nome: string;
  email: string;
  emailConfirmado: boolean;
};

export const ROTA_DE_ENTRADA = "/entrar";

// Uma conta por pessoa no MVP. O `upsert` cria a conta no primeiro acesso e é
// idempotente: mesmo que o cadastro seja interrompido, o usuário nunca fica sem conta.
async function contaDoUsuario(usuarioId: string, nome: string): Promise<string> {
  const conta = await getPrisma().conta.upsert({
    where: { usuarioId },
    update: {},
    create: { usuarioId, nome },
    select: { id: true },
  });
  return conta.id;
}

/** Sessão validada no servidor (não só a presença do cookie). `cache` evita repetir a consulta na mesma requisição. */
export const obterSessao = cache(async (): Promise<Sessao | null> => {
  // `headers()` vem antes de `getAuth()`: é ele que marca a página como dinâmica.
  // Na ordem inversa, o build tenta pré-renderizar a tela e exige a configuração,
  // que não existe no build da imagem Docker.
  const cabecalhos = await headers();
  const sessao = await getAuth().api.getSession({ headers: cabecalhos });
  if (!sessao) return null;
  const { id, name, email, emailVerified } = sessao.user;
  return { usuarioId: id, contaId: await contaDoUsuario(id, name), nome: name, email, emailConfirmado: emailVerified };
});

/** Para telas e ações protegidas: sem sessão válida, manda para o login. */
export async function exigirSessao(): Promise<Sessao> {
  const sessao = await obterSessao();
  if (!sessao) redirect(ROTA_DE_ENTRADA);
  return sessao;
}
