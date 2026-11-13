"use client";

import { useActionState } from "react";
import { BotaoEnviar, Campo, MensagemDoFormulario } from "@/components/formulario";
import type { EstadoDoFormulario } from "@/lib/formulario";

type Acao = (anterior: EstadoDoFormulario, formulario: FormData) => Promise<EstadoDoFormulario>;

export function FormularioDaConta({ acao, inicial }: { acao: Acao; inicial: Record<string, string> }) {
  const [estado, enviar] = useActionState(acao, { valores: inicial });
  const valores = estado.valores ?? {};
  return (
    <form action={enviar} className="grid gap-4">
      <MensagemDoFormulario estado={estado} />
      <Campo rotulo="Nome da conta" name="nome" required minLength={2} maxLength={120} autoComplete="off" defaultValue={valores.nome} dica="Seu nome ou o do escritório." />
      <fieldset className="grid gap-4 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Advogado substituto</legend>
        <p className="text-sm text-muted-foreground">
          Um colega de confiança. Se um prazo chegar à véspera sem a sua conferência, ele recebe um e-mail pedindo que fale com você. Ele não ganha acesso ao sistema.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Nome do substituto" name="substitutoNome" maxLength={120} autoComplete="off" defaultValue={valores.substitutoNome} />
          <Campo rotulo="E-mail do substituto" name="substitutoEmail" type="email" inputMode="email" maxLength={254} autoComplete="off" defaultValue={valores.substitutoEmail} />
        </div>
      </fieldset>
      <BotaoEnviar enviando="Salvando…" className="sm:justify-self-start sm:px-5">
        Salvar
      </BotaoEnviar>
    </form>
  );
}
