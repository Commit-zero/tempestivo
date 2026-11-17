"use client";

import { useActionState } from "react";
import { BotaoEnviar, MensagemDoFormulario } from "@/components/formulario";
import type { EstadoDoFormulario } from "@/lib/formulario";

// Aviso do painel enquanto o e-mail da conta não foi confirmado: sem a confirmação,
// os alertas de prazo não são enviados.
export function AvisoDeConfirmacaoDeEmail({ email, acao }: { email: string; acao: () => Promise<EstadoDoFormulario> }) {
  const [estado, enviar] = useActionState(acao, {});
  return (
    <section aria-label="Confirmação de e-mail" className="grid gap-3 rounded-xl border border-atencao/30 bg-atencao-fundo p-4 text-sm text-atencao">
      <p>
        <strong>Confirme o seu e-mail para receber os alertas de prazo.</strong> Enviamos um link para <span className="break-all">{email}</span>.
        Até a confirmação, nenhum alerta é enviado.
      </p>
      <form action={enviar} className="grid gap-2">
        <MensagemDoFormulario estado={estado} />
        {estado.aviso ? null : (
          <BotaoEnviar variant="outline" enviando="Enviando…" className="justify-self-start bg-card">
            Reenviar o link
          </BotaoEnviar>
        )}
      </form>
    </section>
  );
}
