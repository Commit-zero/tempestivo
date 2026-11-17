"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { valoresDe, type EstadoDoFormulario } from "@/lib/formulario";
import { criarHonorario, definirPagamentoDaParcela, excluirHonorario } from "@/modules/honorarios";
import { exigirId } from "@/lib/ids";
import { exigirSessao } from "@/platform/auth";

const CAMPOS = ["clienteId", "processoId", "descricao", "valorTotal", "parcelas", "primeiroVencimento"] as const;

function atualizarTelas(id?: string): void {
  revalidatePath("/honorarios");
  revalidatePath("/painel");
  if (id) revalidatePath(`/honorarios/${id}`);
}

export async function acaoCriarHonorario(_anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  const { contaId } = await exigirSessao();
  const valores = valoresDe(formulario, CAMPOS) as Record<(typeof CAMPOS)[number], string>;
  const criado = await criarHonorario(contaId, valores);
  if (!criado.ok) return { erro: criado.erro, valores };
  atualizarTelas();
  redirect(`/honorarios/${criado.valor.id}`);
}

export async function acaoDefinirPagamento(parcelaId: string, paga: boolean): Promise<void> {
  exigirId(parcelaId);
  const { contaId } = await exigirSessao();
  const resultado = await definirPagamentoDaParcela(contaId, parcelaId, paga);
  if (resultado.ok) atualizarTelas(resultado.valor);
}

export async function acaoExcluirHonorario(id: string): Promise<EstadoDoFormulario> {
  exigirId(id);
  const { contaId } = await exigirSessao();
  const excluido = await excluirHonorario(contaId, id);
  if (!excluido.ok) return { erro: excluido.erro };
  atualizarTelas();
  redirect("/honorarios");
}
