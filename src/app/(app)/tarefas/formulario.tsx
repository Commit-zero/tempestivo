"use client";

import { useActionState } from "react";
import { BotaoEnviar, Campo, CampoDeEscolha, MensagemDoFormulario } from "@/components/formulario";
import type { EstadoDoFormulario } from "@/lib/formulario";

type Acao = (anterior: EstadoDoFormulario, formulario: FormData) => Promise<EstadoDoFormulario>;

export function FormularioDeTarefa({ acao, processos }: { acao: Acao; processos: { id: string; rotulo: string }[] }) {
  const [estado, enviar] = useActionState(acao, {});
  const valores = estado.valores ?? {};
  return (
    <form action={enviar} className="grid gap-4">
      <MensagemDoFormulario estado={estado} />
      <Campo rotulo="Nova tarefa" name="titulo" required minLength={2} maxLength={160} autoComplete="off" placeholder="O que precisa ser feito?" defaultValue={valores.titulo} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Data limite" name="limite" type="date" defaultValue={valores.limite} dica="Opcional." />
        <CampoDeEscolha rotulo="Processo" name="processoId" defaultValue={valores.processoId ?? ""} dica="Opcional.">
          <option value="">Sem processo</option>
          {processos.map((processo) => (
            <option key={processo.id} value={processo.id}>
              {processo.rotulo}
            </option>
          ))}
        </CampoDeEscolha>
      </div>
      <BotaoEnviar enviando="Adicionando…" className="sm:justify-self-start sm:px-5">
        Adicionar tarefa
      </BotaoEnviar>
    </form>
  );
}
