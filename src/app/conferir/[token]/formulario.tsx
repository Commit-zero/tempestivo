"use client";

import { useActionState } from "react";
import { BotaoEnviar, MensagemDoFormulario } from "@/components/formulario";
import type { EstadoDoFormulario } from "@/lib/formulario";

export function FormularioDeConferencia({
  acao, cumprido,
}: {
  acao: () => Promise<EstadoDoFormulario>;
  cumprido: boolean;
}) {
  const [estado, enviar] = useActionState(acao, {});
  if (cumprido) return <p className="text-sm text-muted-foreground">Este prazo já foi marcado como cumprido.</p>;
  return (
    <form action={enviar} className="grid gap-3">
      <MensagemDoFormulario estado={estado} />
      {estado.aviso ? null : (
        <BotaoEnviar enviando="Registrando…" className="w-full">
          Li e conferi
        </BotaoEnviar>
      )}
    </form>
  );
}
