"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { valoresDe, type EstadoDoFormulario } from "@/lib/formulario";
import { atualizarConta, excluirConta } from "@/modules/conta";
import { exigirSessao } from "@/platform/auth";

export async function acaoSalvarConta(_anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  const { contaId } = await exigirSessao();
  const valores = valoresDe(formulario, ["nome", "substitutoNome", "substitutoEmail"]) as Record<"nome" | "substitutoNome" | "substitutoEmail", string>;
  const resultado = await atualizarConta(contaId, valores);
  if (!resultado.ok) return { erro: resultado.erro, valores };
  revalidatePath("/conta");
  return { aviso: "Dados salvos.", valores };
}

// Apagar o usuário apaga também as sessões dele, então o cookie deixa de valer na hora.
export async function acaoExcluirConta(_anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  const sessao = await exigirSessao();
  const resultado = await excluirConta(sessao, formulario.get("email"));
  if (!resultado.ok) return { erro: resultado.erro };
  redirect("/?conta=excluida");
}
