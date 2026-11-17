"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { valoresDe, type EstadoDoFormulario } from "@/lib/formulario";
import { atualizarProcesso, criarProcesso, excluirProcesso, mudarStatusDoProcesso, type StatusProcesso } from "@/modules/processos";
import { exigirId } from "@/lib/ids";
import { exigirSessao } from "@/platform/auth";

const CAMPOS = ["clienteId", "numero", "tribunal", "vara", "assunto", "parteContraria"] as const;

/** `id` nulo cria; preenchido atualiza. A conta vem sempre da sessão. */
export async function acaoSalvarProcesso(id: string | null, _anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  if (id !== null) exigirId(id);
  const { contaId } = await exigirSessao();
  const valores = valoresDe(formulario, CAMPOS) as Record<(typeof CAMPOS)[number], string>;
  if (id === null) {
    const criado = await criarProcesso(contaId, valores);
    if (!criado.ok) return { erro: criado.erro, valores };
    revalidatePath("/processos");
    redirect(`/processos/${criado.valor.id}`);
  }
  const atualizado = await atualizarProcesso(contaId, id, valores);
  if (!atualizado.ok) return { erro: atualizado.erro, valores };
  revalidatePath("/processos");
  redirect(`/processos/${id}`);
}

export async function acaoMudarStatusDoProcesso(id: string, status: StatusProcesso): Promise<void> {
  exigirId(id);
  const { contaId } = await exigirSessao();
  await mudarStatusDoProcesso(contaId, id, status);
  revalidatePath("/processos");
  revalidatePath(`/processos/${id}`);
}

export async function acaoExcluirProcesso(id: string): Promise<EstadoDoFormulario> {
  exigirId(id);
  const { contaId } = await exigirSessao();
  const excluido = await excluirProcesso(contaId, id);
  if (!excluido.ok) return { erro: excluido.erro };
  revalidatePath("/processos");
  redirect("/processos");
}
