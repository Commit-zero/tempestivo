"use server";

import { revalidatePath } from "next/cache";
import { valoresDe, type EstadoDoFormulario } from "@/lib/formulario";
import { criarTarefa, excluirTarefa, moverTarefa, type Coluna } from "@/modules/tarefas";
import { exigirSessao } from "@/platform/auth";

function atualizarTelas(): void {
  revalidatePath("/tarefas");
  revalidatePath("/painel");
}

export async function acaoCriarTarefa(_anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  const { contaId } = await exigirSessao();
  const valores = valoresDe(formulario, ["titulo", "limite", "processoId"]) as Record<"titulo" | "limite" | "processoId", string>;
  const criada = await criarTarefa(contaId, { ...valores, descricao: "" });
  if (!criada.ok) return { erro: criada.erro, valores };
  atualizarTelas();
  return {};
}

export async function acaoMoverTarefa(id: string, coluna: Coluna): Promise<void> {
  const { contaId } = await exigirSessao();
  await moverTarefa(contaId, id, coluna);
  atualizarTelas();
}

export async function acaoExcluirTarefa(id: string): Promise<void> {
  const { contaId } = await exigirSessao();
  await excluirTarefa(contaId, id);
  atualizarTelas();
}
