"use client";

import { useActionState, type ComponentProps } from "react";
import { BotaoEnviar, MensagemDoFormulario } from "@/components/formulario";
import type { EstadoDoFormulario } from "@/lib/formulario";

// Botão de ação destrutiva: pede confirmação antes de enviar o formulário.
export function BotaoComConfirmacao({
  pergunta, children, ...props
}: ComponentProps<typeof BotaoEnviar> & { pergunta: string }) {
  return (
    <BotaoEnviar
      variant="destructive"
      onClick={(evento) => {
        if (!window.confirm(pergunta)) evento.preventDefault();
      }}
      {...props}
    >
      {children}
    </BotaoEnviar>
  );
}

/** Formulário de um botão só para excluir um registro, com confirmação e mensagem de erro. */
export function FormularioDeExclusao({
  acao, pergunta, rotulo,
}: {
  acao: (anterior: EstadoDoFormulario) => Promise<EstadoDoFormulario>;
  pergunta: string;
  rotulo: string;
}) {
  const [estado, enviar] = useActionState(acao, {});
  return (
    <form action={enviar} className="grid gap-3">
      <MensagemDoFormulario estado={estado} />
      <BotaoComConfirmacao pergunta={pergunta} enviando="Excluindo…" className="sm:justify-self-start sm:px-5">
        {rotulo}
      </BotaoComConfirmacao>
    </form>
  );
}
