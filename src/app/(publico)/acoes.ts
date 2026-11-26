"use server";

import { redirect } from "next/navigation";
import { valoresDe, type EstadoDoFormulario } from "@/lib/formulario";
import {
  cadastrar, confirmarCodigoDeEntrada, confirmarCodigoDeRecuperacao, entrar, pedirRedefinicaoDeSenha, redefinirSenha,
  type ResultadoDoSegundoFator,
} from "@/platform/auth";

const ROTA_INICIAL = "/painel";

export async function acaoEntrar(_anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  const resultado = await entrar({ email: formulario.get("email"), senha: formulario.get("senha") });
  if (!resultado.ok) return { erro: resultado.erro, valores: valoresDe(formulario, ["email"]) };
  if ("segundoFator" in resultado) redirect("/entrar/codigo");
  redirect(ROTA_INICIAL);
}

function aposOCodigo(resultado: ResultadoDoSegundoFator): EstadoDoFormulario {
  if (resultado.ok) redirect(ROTA_INICIAL);
  if (resultado.recomecar) redirect(`/entrar?codigo=${resultado.recomecar}`);
  return { erro: resultado.erro };
}

export async function acaoConfirmarCodigo(_anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  return aposOCodigo(await confirmarCodigoDeEntrada(formulario.get("codigo")));
}

export async function acaoConfirmarRecuperacao(_anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  return aposOCodigo(await confirmarCodigoDeRecuperacao(formulario.get("codigo")));
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
