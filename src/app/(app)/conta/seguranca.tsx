"use client";

import { useActionState } from "react";
import { BotaoEnviar, Campo, MensagemDoFormulario } from "@/components/formulario";
import { CamposDeSenhaNova } from "@/components/senha-nova";
import type { EstadoDoFormulario } from "@/lib/formulario";

type Acao = (anterior: EstadoDoFormulario, formulario: FormData) => Promise<EstadoDoFormulario>;

export function FormularioDeTrocaDeSenha({ acao, email }: { acao: Acao; email: string }) {
  const [estado, enviar] = useActionState(acao, {});
  return (
    <form action={enviar} className="grid gap-4">
      <MensagemDoFormulario estado={estado} />
      <Campo rotulo="Senha atual" name="senhaAtual" type="password" autoComplete="current-password" required maxLength={128} />
      <CamposDeSenhaNova rotulo="Nova senha" rotuloDaConfirmacao="Confirme a nova senha" email={email} />
      <BotaoEnviar enviando="Trocando…" className="sm:justify-self-start sm:px-5">
        Trocar a senha
      </BotaoEnviar>
    </form>
  );
}
