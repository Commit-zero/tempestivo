"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { valoresDe, type EstadoDoFormulario } from "@/lib/formulario";
import { ativarAgenda, atualizarConta, definirMargemDeSeguranca, desativarAgenda, excluirConta } from "@/modules/conta";
import {
  confirmarAtivacao, confirmarSenhaAtual, desativarSegundoFator, exigirSessao, gerarNovosCodigos, iniciarAtivacao, trocarSenha,
} from "@/platform/auth";
import { getConfig } from "@/platform/config";
import { getMailer } from "@/platform/runtime";
import type { EstadoDaAgenda } from "./agenda";
import type { EstadoDaConfirmacao, EstadoDoInicio } from "./segundo-fator";

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

export async function acaoIniciarSegundoFator(_anterior: EstadoDoInicio, formulario: FormData): Promise<EstadoDoInicio> {
  const resultado = await iniciarAtivacao(await exigirSessao(), formulario.get("senha"));
  if (!resultado.ok) return { erro: resultado.erro };
  return { qrCode: resultado.qrCode, chave: resultado.chave, endereco: resultado.endereco };
}

export async function acaoConfirmarSegundoFator(_anterior: EstadoDaConfirmacao, formulario: FormData): Promise<EstadoDaConfirmacao> {
  const resultado = await confirmarAtivacao(await exigirSessao(), formulario.get("codigo"));
  // Mesmo com erro a proteção pode ter ligado: a tela sempre mostra o estado atual.
  revalidatePath("/conta");
  return resultado.ok ? { codigos: resultado.codigos, atencao: resultado.atencao } : { erro: resultado.erro };
}

export async function acaoGerarCodigos(_anterior: EstadoDaConfirmacao, formulario: FormData): Promise<EstadoDaConfirmacao> {
  const resultado = await gerarNovosCodigos(await exigirSessao(), formulario.get("senha"));
  return resultado.ok ? { codigos: resultado.codigos } : { erro: resultado.erro };
}

export async function acaoDesativarSegundoFator(_anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  const resultado = await desativarSegundoFator(await exigirSessao(), formulario.get("senha"));
  if (!resultado.ok) return { erro: resultado.erro };
  revalidatePath("/conta");
  return { aviso: "Verificação em duas etapas desligada. O login volta a pedir só a senha." };
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
