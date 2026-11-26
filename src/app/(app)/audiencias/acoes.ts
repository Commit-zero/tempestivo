"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { valoresDe, type EstadoDoFormulario } from "@/lib/formulario";
import { atualizarAudiencia, criarAudiencia, excluirAudiencia } from "@/modules/audiencias";
import { exigirId } from "@/lib/ids";
import { avisar } from "../avisar";
import { foiConfirmado, SEM_CONFIRMACAO } from "@/lib/confirmacao";
import { exigirSessao } from "@/platform/auth";

const CAMPOS = ["processoId", "tipo", "data", "hora", "duracaoMin", "local", "linkVirtual", "observacoes"] as const;

function atualizarTelas(): void {
  revalidatePath("/audiencias");
  revalidatePath("/painel");
}

/** `id` nulo cria; preenchido atualiza. A conta vem sempre da sessão. */
export async function acaoSalvarAudiencia(id: string | null, _anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  if (id !== null) exigirId(id);
  const { contaId } = await exigirSessao();
  const valores = valoresDe(formulario, CAMPOS) as Record<(typeof CAMPOS)[number], string>;
  const resultado = id === null ? await criarAudiencia(contaId, valores) : await atualizarAudiencia(contaId, id, valores);
  if (!resultado.ok) return { erro: resultado.erro, valores };
  atualizarTelas();
  await avisar(id === null ? "audiencia-cadastrada" : "audiencia-salva");
  redirect("/audiencias");
}

export async function acaoExcluirAudiencia(id: string, _anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  exigirId(id);
  const { contaId } = await exigirSessao();
  if (!foiConfirmado(formulario)) return { erro: SEM_CONFIRMACAO };
  const excluida = await excluirAudiencia(contaId, id);
  if (!excluida.ok) return { erro: excluida.erro };
  atualizarTelas();
  await avisar("audiencia-excluida");
  redirect("/audiencias");
}
