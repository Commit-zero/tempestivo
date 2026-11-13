"use client";

import { useActionState } from "react";
import { BotaoEnviar, MensagemDoFormulario } from "@/components/formulario";
import type { EstadoDoFormulario } from "@/lib/formulario";

export function FormularioDeConferencia({
  acao, jaConferido, cumprido,
}: {
  acao: () => Promise<EstadoDoFormulario>;
  jaConferido: boolean;
  cumprido: boolean;
}) {
  const [estado, enviar] = useActionState(acao, {});
  if (cumprido) return <p className="text-sm text-muted-foreground">Este prazo já foi marcado como cumprido.</p>;
  if (jaConferido && !estado.aviso) return <p className="text-sm text-muted-foreground">A conferência por este link já foi registrada.</p>;
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
