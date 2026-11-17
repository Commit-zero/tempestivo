"use server";

import { redirect } from "next/navigation";
import type { EstadoDoFormulario } from "@/lib/formulario";
import { exigirSessao, reenviarConfirmacaoDeEmail, ROTA_DE_ENTRADA, sair } from "@/platform/auth";

export async function acaoSair(): Promise<void> {
  await sair();
  redirect(ROTA_DE_ENTRADA);
}

export async function acaoReenviarConfirmacao(): Promise<EstadoDoFormulario> {
  const sessao = await exigirSessao();
  const resultado = await reenviarConfirmacaoDeEmail(sessao);
  return resultado.ok ? { aviso: `Enviamos um novo link para ${sessao.email}.` } : { erro: resultado.erro };
}
