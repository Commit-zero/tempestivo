"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { valoresDe, type EstadoDoFormulario } from "@/lib/formulario";
import { atualizarAudiencia, criarAudiencia, excluirAudiencia } from "@/modules/audiencias";
import { exigirSessao } from "@/platform/auth";

const CAMPOS = ["processoId", "tipo", "data", "hora", "duracaoMin", "local", "linkVirtual", "observacoes"] as const;

function atualizarTelas(): void {
  revalidatePath("/audiencias");
  revalidatePath("/painel");
}

/** `id` nulo cria; preenchido atualiza. A conta vem sempre da sessão. */
export async function acaoSalvarAudiencia(id: string | null, _anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  const { contaId } = await exigirSessao();
  const valores = valoresDe(formulario, CAMPOS) as Record<(typeof CAMPOS)[number], string>;
  const resultado = id === null ? await criarAudiencia(contaId, valores) : await atualizarAudiencia(contaId, id, valores);
  if (!resultado.ok) return { erro: resultado.erro, valores };
  atualizarTelas();
  redirect("/audiencias");
}

export async function acaoExcluirAudiencia(id: string): Promise<EstadoDoFormulario> {
  const { contaId } = await exigirSessao();
  const excluida = await excluirAudiencia(contaId, id);
  if (!excluida.ok) return { erro: excluida.erro };
  atualizarTelas();
  redirect("/audiencias");
}
