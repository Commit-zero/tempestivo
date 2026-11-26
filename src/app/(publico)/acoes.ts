"use server";

import { redirect } from "next/navigation";
import { valoresDe, type EstadoDoFormulario } from "@/lib/formulario";
import { cadastrar, entrar, pedirRedefinicaoDeSenha, redefinirSenha } from "@/platform/auth";

const ROTA_INICIAL = "/painel";

export async function acaoEntrar(_anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  const resultado = await entrar({ email: formulario.get("email"), senha: formulario.get("senha") });
  if (!resultado.ok) return { erro: resultado.erro, valores: valoresDe(formulario, ["email"]) };
  redirect(ROTA_INICIAL);
}

export async function acaoCadastrar(_anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  if (formulario.get("aceite") !== "on") {
    return {
      erro: "Para criar a conta, confirme que leu o aviso sobre o cálculo auxiliar e os dados.",
      valores: valoresDe(formulario, ["nome", "email"]),
    };
  }
  const resultado = await cadastrar({
    nome: formulario.get("nome"),
    email: formulario.get("email"),
    senha: formulario.get("senha"),
    confirmacao: formulario.get("confirmacao"),
  });
  if (!resultado.ok) return { erro: resultado.erro, valores: valoresDe(formulario, ["nome", "email"]) };
  redirect(ROTA_INICIAL);
}

export async function acaoPedirRedefinicao(_anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  const resultado = await pedirRedefinicaoDeSenha({ email: formulario.get("email") });
  if (!resultado.ok) return { erro: resultado.erro };
  return { aviso: "Se houver uma conta com este e-mail, enviamos um link para criar uma nova senha. Ele vale por 1 hora." };
}

export async function acaoRedefinirSenha(_anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  const resultado = await redefinirSenha({
    token: formulario.get("token"),
    senha: formulario.get("senha"),
    confirmacao: formulario.get("confirmacao"),
  });
  if (!resultado.ok) return { erro: resultado.erro };
  redirect("/entrar?senha=redefinida");
}
