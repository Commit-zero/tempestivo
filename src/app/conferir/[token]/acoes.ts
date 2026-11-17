"use server";

import type { EstadoDoFormulario } from "@/lib/formulario";
import { confirmarPeloLink } from "@/modules/alertas";

// Sem sessão de propósito: quem autoriza é o token de uso único enviado ao e-mail do titular.
export async function acaoConfirmarPeloLink(token: string): Promise<EstadoDoFormulario> {
  const resultado = await confirmarPeloLink(token);
  return resultado.ok ? { aviso: "Conferência registrada. Obrigado por conferir." } : { erro: resultado.erro };
}
