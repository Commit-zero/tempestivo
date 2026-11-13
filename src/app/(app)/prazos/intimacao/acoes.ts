"use server";

import { lerIntimacao, type Rascunho } from "@/modules/intimacao";
import { exigirSessao } from "@/platform/auth";
import { getExtrator } from "@/platform/runtime";

export type EstadoDaLeitura = { erro?: string; rascunho?: Rascunho };

// Só lê e devolve o rascunho para a tela: nada é gravado, nem o texto nem o prazo.
export async function acaoLerIntimacao(_anterior: EstadoDaLeitura, formulario: FormData): Promise<EstadoDaLeitura> {
  const { contaId } = await exigirSessao();
  const lido = await lerIntimacao(contaId, formulario.get("texto"), getExtrator());
  return lido.ok ? { rascunho: lido.valor } : { erro: lido.erro };
}
