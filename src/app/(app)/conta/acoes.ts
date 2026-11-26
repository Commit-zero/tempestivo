"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { valoresDe, type EstadoDoFormulario } from "@/lib/formulario";
import { ativarAgenda, atualizarConta, definirMargemDeSeguranca, desativarAgenda, excluirConta } from "@/modules/conta";
import { confirmarSenhaAtual, exigirSessao, trocarSenha } from "@/platform/auth";
import { getConfig } from "@/platform/config";
import { getMailer } from "@/platform/runtime";
import type { EstadoDaAgenda } from "./agenda";

export async function acaoSalvarConta(_anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  const { contaId } = await exigirSessao();
  const valores = valoresDe(formulario, ["nome", "substitutoNome", "substitutoEmail"]) as Record<"nome" | "substitutoNome" | "substitutoEmail", string>;
  const resultado = await atualizarConta(contaId, valores, { mailer: getMailer(), appUrl: getConfig().APP_URL });
  if (!resultado.ok) return { erro: resultado.erro, valores };
  revalidatePath("/conta");
  return {
    aviso: resultado.valor.conviteEnviado
      ? "Dados salvos. Enviamos um convite ao substituto: ele só recebe avisos depois de aceitar."
      : "Dados salvos.",
    valores,
  };
}

export async function acaoTrocarSenha(_anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  const sessao = await exigirSessao();
  const resultado = await trocarSenha(sessao, {
    senhaAtual: formulario.get("senhaAtual"),
    senha: formulario.get("senha"),
    confirmacao: formulario.get("confirmacao"),
  });
  if (!resultado.ok) return { erro: resultado.erro };
  return { aviso: "Senha trocada. As sessões em outros aparelhos foram encerradas." };
}

// Pede a senha atual: uma sessão esquecida aberta não basta para apagar tudo.
// Apagar o usuário apaga também as sessões dele, então o cookie deixa de valer na hora.
export async function acaoExcluirConta(_anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  const sessao = await exigirSessao();
  const senha = await confirmarSenhaAtual(sessao.usuarioId, formulario.get("senha"));
  if (!senha.ok) return { erro: senha.erro };
  const resultado = await excluirConta(sessao);
  if (!resultado.ok) return { erro: resultado.erro };
  redirect("/?conta=excluida");
}

export async function acaoDefinirMargem(_anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  const { contaId } = await exigirSessao();
  const valores = { margem: String(formulario.get("margem") ?? "") };
  const resultado = await definirMargemDeSeguranca(contaId, formulario.get("margem"));
  if (!resultado.ok) return { erro: resultado.erro, valores };
  revalidatePath("/conta");
  revalidatePath("/prazos");
  revalidatePath("/painel");
  return { aviso: "Margem salva. A meta interna dos prazos já foi recalculada.", valores };
}

/** Cria ou troca o link da agenda; o link só é mostrado nesta resposta. */
export async function acaoAtivarAgenda(): Promise<EstadoDaAgenda> {
  const { contaId } = await exigirSessao();
  const resultado = await ativarAgenda(contaId);
  if (!resultado.ok) return { erro: resultado.erro };
  revalidatePath("/conta");
  return { link: `${getConfig().APP_URL.replace(/\/$/, "")}/agenda/${resultado.valor.token}/calendario.ics` };
}

export async function acaoDesativarAgenda(): Promise<EstadoDaAgenda> {
  const { contaId } = await exigirSessao();
  const resultado = await desativarAgenda(contaId);
  if (!resultado.ok) return { erro: resultado.erro };
  revalidatePath("/conta");
  return { aviso: "Agenda desligada. O link deixou de funcionar e o calendário para de atualizar; os eventos que ele já baixou continuam lá até você remover a agenda assinada no próprio calendário." };
}
