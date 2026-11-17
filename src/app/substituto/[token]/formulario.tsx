"use client";

import { useActionState } from "react";
import { BotaoEnviar, MensagemDoFormulario } from "@/components/formulario";
import type { EstadoDoFormulario } from "@/lib/formulario";

export function FormularioDeAceite({ acao }: { acao: () => Promise<EstadoDoFormulario> }) {
  const [estado, enviar] = useActionState(acao, {});
  return (
    <form action={enviar} className="grid gap-3">
      <MensagemDoFormulario estado={estado} />
      {estado.aviso ? null : (
        <BotaoEnviar enviando="Registrando…" className="w-full">
          Aceitar ser substituto
        </BotaoEnviar>
      )}
    </form>
  );
}
