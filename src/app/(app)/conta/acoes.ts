"use server";

import { revalidatePath } from "next/cache";
import { valoresDe, type EstadoDoFormulario } from "@/lib/formulario";
import { atualizarConta } from "@/modules/conta";
import { exigirSessao } from "@/platform/auth";

export async function acaoSalvarConta(_anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  const { contaId } = await exigirSessao();
  const valores = valoresDe(formulario, ["nome", "substitutoNome", "substitutoEmail"]) as Record<"nome" | "substitutoNome" | "substitutoEmail", string>;
  const resultado = await atualizarConta(contaId, valores);
  if (!resultado.ok) return { erro: resultado.erro, valores };
  revalidatePath("/conta");
  return { aviso: "Dados salvos.", valores };
}
