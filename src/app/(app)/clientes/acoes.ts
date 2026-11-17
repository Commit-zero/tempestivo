"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { valoresDe, type EstadoDoFormulario } from "@/lib/formulario";
import { atualizarCliente, criarCliente, excluirCliente } from "@/modules/clientes";
import { exigirId } from "@/lib/ids";
import { exigirSessao } from "@/platform/auth";

const CAMPOS = ["nome", "documento", "email", "telefone", "observacoes"] as const;

function ler(formulario: FormData) {
  return valoresDe(formulario, CAMPOS) as Record<(typeof CAMPOS)[number], string>;
}

/** `id` nulo cria; preenchido atualiza. A conta vem sempre da sessão. */
export async function acaoSalvarCliente(id: string | null, _anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  if (id !== null) exigirId(id);
  const { contaId } = await exigirSessao();
  const valores = ler(formulario);
  if (id === null) {
    const criado = await criarCliente(contaId, valores);
    if (!criado.ok) return { erro: criado.erro, valores };
    revalidatePath("/clientes");
    redirect(`/clientes/${criado.valor.id}`);
  }
  const atualizado = await atualizarCliente(contaId, id, valores);
  if (!atualizado.ok) return { erro: atualizado.erro, valores };
  revalidatePath("/clientes");
  return { aviso: "Cliente salvo.", valores };
}

export async function acaoExcluirCliente(id: string): Promise<EstadoDoFormulario> {
  exigirId(id);
  const { contaId } = await exigirSessao();
  const excluido = await excluirCliente(contaId, id);
  if (!excluido.ok) return { erro: excluido.erro };
  revalidatePath("/clientes");
  redirect("/clientes");
}
