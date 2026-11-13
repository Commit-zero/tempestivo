"use client";

import { useActionState } from "react";
import { BotaoEnviar, Campo, CampoDeEscolha, CampoDeTexto, MensagemDoFormulario } from "@/components/formulario";
import type { EstadoDoFormulario } from "@/lib/formulario";

type Acao = (anterior: EstadoDoFormulario, formulario: FormData) => Promise<EstadoDoFormulario>;

export function FormularioDeAudiencia({
  acao, processos, inicial, editando = false,
}: {
  acao: Acao;
  processos: { id: string; rotulo: string }[];
  inicial: Record<string, string>;
  editando?: boolean;
}) {
  const [estado, enviar] = useActionState(acao, { valores: inicial });
  const valores = estado.valores ?? {};
  return (
    <form action={enviar} className="grid gap-4">
      <MensagemDoFormulario estado={estado} />
      {editando ? (
        <input type="hidden" name="processoId" value={valores.processoId} />
      ) : (
        <CampoDeEscolha rotulo="Processo" name="processoId" required defaultValue={valores.processoId ?? ""} key={valores.processoId}>
          <option value="" disabled>
            Escolha o processo
          </option>
          {processos.map((processo) => (
            <option key={processo.id} value={processo.id}>
              {processo.rotulo}
            </option>
          ))}
        </CampoDeEscolha>
      )}
      <Campo rotulo="Tipo" name="tipo" required minLength={2} maxLength={80} autoComplete="off" list="tipos-de-audiencia" defaultValue={valores.tipo} />
      <datalist id="tipos-de-audiencia">
        {["Conciliação", "Instrução e julgamento", "Una", "Justificação", "Mediação"].map((tipo) => (
          <option key={tipo} value={tipo} />
        ))}
      </datalist>
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Data" name="data" type="date" required defaultValue={valores.data} />
        <Campo rotulo="Hora" name="hora" type="time" required defaultValue={valores.hora} dica="Horário de Brasília." />
        <Campo rotulo="Duração (min)" name="duracaoMin" type="number" inputMode="numeric" required min={5} max={720} defaultValue={valores.duracaoMin} />
      </div>
      <Campo rotulo="Local" name="local" maxLength={200} autoComplete="off" defaultValue={valores.local} dica="Endereço do fórum ou da vara. Usado no link de rota." />
      <Campo rotulo="Link da audiência virtual" name="linkVirtual" type="url" inputMode="url" maxLength={500} autoComplete="off" placeholder="https://" defaultValue={valores.linkVirtual} />
      <CampoDeTexto rotulo="Observações" name="observacoes" maxLength={2000} defaultValue={valores.observacoes} />
      <BotaoEnviar enviando="Salvando…" className="sm:justify-self-start sm:px-5">
        {editando ? "Salvar" : "Cadastrar audiência"}
      </BotaoEnviar>
    </form>
  );
}
