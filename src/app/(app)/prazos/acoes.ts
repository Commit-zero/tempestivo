"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoDoFormulario } from "@/lib/formulario";
import {
  ajustarTipoDoCatalogo, cadastrarDiaSemExpediente, cadastrarPrazo, confirmarConferencia, criarTipoDePrazo,
  desfazerCumprido, editarPrazo, excluirDiaSemExpediente, excluirPrazo, marcarComoCumprido, previsualizarPrazo,
  removerTipoDaConta, type EntradaDePrazo, type ResultadoCalculo,
} from "@/modules/prazos";
import { exigirId } from "@/lib/ids";
import { exigirSessao } from "@/platform/auth";

// A conta e o usuário vêm sempre da sessão, nunca do formulário.

function atualizarTelas(id?: string): void {
  revalidatePath("/prazos");
  revalidatePath("/painel");
  if (id) revalidatePath(`/prazos/${id}`);
}

function lerPrazo(formulario: FormData): EntradaDePrazo {
  return {
    origem: formulario.get("origem"),
    processoId: formulario.get("processoId"),
    descricao: formulario.get("descricao"),
    dataEvento: formulario.get("dataEvento"),
    tipoEvento: formulario.get("tipoEvento"),
    dias: formulario.get("dias"),
    contagem: formulario.get("contagem"),
    emDobro: formulario.get("emDobro") === "on",
    dataFinal: formulario.get("dataFinal"),
    conferiNosAutos: formulario.get("conferiNosAutos") === "on",
  };
}

export type DadosDaPrevia = {
  processoId: string; dataEvento: string; tipoEvento: string; dias: string; contagem: string; emDobro: boolean;
};

/** Prévia do cálculo: não grava nada. */
export async function acaoPreverPrazo({ processoId, ...entrada }: DadosDaPrevia): Promise<ResultadoCalculo> {
  const { contaId } = await exigirSessao();
  return previsualizarPrazo(contaId, processoId, entrada);
}

/** `id` nulo cadastra; preenchido edita. */
export async function acaoSalvarPrazo(id: string | null, _anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  if (id !== null) exigirId(id);
  const { contaId } = await exigirSessao();
  const entrada = lerPrazo(formulario);
  if (id === null) {
    const criado = await cadastrarPrazo(contaId, entrada);
    if (!criado.ok) return { erro: criado.erro };
    atualizarTelas();
    redirect(`/prazos/${criado.valor.id}`);
  }
  const editado = await editarPrazo(contaId, id, entrada);
  if (!editado.ok) return { erro: editado.erro };
  atualizarTelas(id);
  redirect(`/prazos/${id}${editado.valor.conferenciaZerada ? "?conferencia=zerada" : ""}`);
}

export async function acaoConfirmarConferencia(id: string): Promise<void> {
  exigirId(id);
  const { contaId, usuarioId } = await exigirSessao();
  await confirmarConferencia(contaId, id, "app", usuarioId);
  atualizarTelas(id);
}

export async function acaoMarcarComoCumprido(id: string): Promise<void> {
  exigirId(id);
  const { contaId } = await exigirSessao();
  await marcarComoCumprido(contaId, id);
  atualizarTelas(id);
}

export async function acaoDesfazerCumprido(id: string): Promise<void> {
  exigirId(id);
  const { contaId } = await exigirSessao();
  await desfazerCumprido(contaId, id);
  atualizarTelas(id);
}

export async function acaoExcluirPrazo(id: string): Promise<EstadoDoFormulario> {
  exigirId(id);
  const { contaId } = await exigirSessao();
  const excluido = await excluirPrazo(contaId, id);
  if (!excluido.ok) return { erro: excluido.erro };
  atualizarTelas();
  redirect("/prazos");
}

// --- Catálogo e dias sem expediente -----------------------------------------

export async function acaoAjustarTipo(chave: string, _anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  exigirId(chave);
  const { contaId } = await exigirSessao();
  const ajustado = await ajustarTipoDoCatalogo(contaId, chave, { dias: formulario.get("dias"), contagem: formulario.get("contagem") });
  if (!ajustado.ok) return { erro: ajustado.erro };
  revalidatePath("/prazos/catalogo");
  return { aviso: "Salvo para a sua conta." };
}

export async function acaoCriarTipo(_anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  const { contaId } = await exigirSessao();
  const criado = await criarTipoDePrazo(contaId, {
    nome: formulario.get("nome"), dias: formulario.get("dias"), contagem: formulario.get("contagem"),
  });
  if (!criado.ok) return { erro: criado.erro };
  revalidatePath("/prazos/catalogo");
  return { aviso: "Tipo de prazo criado." };
}

export async function acaoRemoverTipo(registroId: string): Promise<void> {
  exigirId(registroId);
  const { contaId } = await exigirSessao();
  await removerTipoDaConta(contaId, registroId);
  revalidatePath("/prazos/catalogo");
}

export async function acaoCadastrarDiaSemExpediente(_anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  const { contaId } = await exigirSessao();
  const cadastrado = await cadastrarDiaSemExpediente(contaId, {
    tribunal: formulario.get("tribunal"), data: formulario.get("data"), motivo: formulario.get("motivo"),
  });
  if (!cadastrado.ok) return { erro: cadastrado.erro };
  revalidatePath("/prazos/catalogo");
  return { aviso: "Dia cadastrado. Ele vale para os próximos cálculos; prazos já salvos não mudam sozinhos." };
}

export async function acaoExcluirDiaSemExpediente(id: string): Promise<void> {
  exigirId(id);
  const { contaId } = await exigirSessao();
  await excluirDiaSemExpediente(contaId, id);
  revalidatePath("/prazos/catalogo");
}
