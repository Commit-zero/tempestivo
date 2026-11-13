"use client";

import { useActionState } from "react";
import { BotaoEnviar, Campo, CampoDeTexto, MensagemDoFormulario } from "@/components/formulario";
import type { EstadoDoFormulario } from "@/lib/formulario";

type Acao = (anterior: EstadoDoFormulario, formulario: FormData) => Promise<EstadoDoFormulario>;

export function FormularioDeCliente({ acao, inicial, rotuloDoBotao }: { acao: Acao; inicial?: Record<string, string>; rotuloDoBotao: string }) {
  const [estado, enviar] = useActionState(acao, { valores: inicial });
  const valores = estado.valores ?? {};
  return (
    <form action={enviar} className="grid gap-4">
      <MensagemDoFormulario estado={estado} />
      <Campo rotulo="Nome" name="nome" required minLength={2} maxLength={160} autoComplete="off" defaultValue={valores.nome} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="CPF ou CNPJ" name="documento" inputMode="numeric" maxLength={18} autoComplete="off" defaultValue={valores.documento} dica="Opcional." />
        <Campo rotulo="Telefone" name="telefone" type="tel" inputMode="tel" maxLength={20} autoComplete="off" defaultValue={valores.telefone} dica="Com DDD. Usado na cobrança pelo WhatsApp." />
      </div>
      <Campo rotulo="E-mail" name="email" type="email" inputMode="email" maxLength={254} autoComplete="off" defaultValue={valores.email} dica="Opcional." />
      <CampoDeTexto rotulo="Observações" name="observacoes" maxLength={2000} defaultValue={valores.observacoes} />
      <BotaoEnviar enviando="Salvando…" className="sm:justify-self-start sm:px-5">
        {rotuloDoBotao}
      </BotaoEnviar>
    </form>
  );
}
