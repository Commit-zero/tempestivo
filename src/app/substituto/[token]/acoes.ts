"use server";

import type { EstadoDoFormulario } from "@/lib/formulario";
import { aceitarConviteDeSubstituto } from "@/modules/conta";

// Sem sessão de propósito: quem autoriza é o token de uso único enviado ao e-mail do substituto.
export async function acaoAceitarConvite(token: string): Promise<EstadoDoFormulario> {
  if (typeof token !== "string") return { erro: "Este convite é inválido, expirou ou já foi aceito." };
  const resultado = await aceitarConviteDeSubstituto(token);
  return resultado.ok ? { aviso: "Convite aceito. Obrigado por ser o substituto." } : { erro: resultado.erro };
}
