"use client";

import { useActionState } from "react";
import { BotaoEnviar, Campo, CampoDeEscolha, MensagemDoFormulario } from "@/components/formulario";
import type { EstadoDoFormulario } from "@/lib/formulario";

type Acao = (anterior: EstadoDoFormulario, formulario: FormData) => Promise<EstadoDoFormulario>;

const controle =
  "h-11 rounded-lg border border-input bg-card px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9 md:text-sm";

/** Linha compacta para ajustar dias e contagem de um tipo do catálogo. */
export function FormularioDeAjuste({ acao, nome, dias, contagem }: { acao: Acao; nome: string; dias: number; contagem: string }) {
  const [estado, enviar] = useActionState(acao, {});
  return (
    <form action={enviar} className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`dias-${nome}`}>
          Dias de {nome}
        </label>
        <input id={`dias-${nome}`} name="dias" type="number" inputMode="numeric" min={1} max={365} required defaultValue={dias} className={`${controle} w-20`} />
        <label className="sr-only" htmlFor={`contagem-${nome}`}>
          Contagem de {nome}
        </label>
        <select id={`contagem-${nome}`} name="contagem" defaultValue={contagem} className={controle}>
          <option value="uteis">dias úteis</option>
          <option value="corridos">dias corridos</option>
        </select>
        <BotaoEnviar variant="outline" enviando="Salvando…">
          Salvar
        </BotaoEnviar>
      </div>
      <MensagemDoFormulario estado={estado} />
    </form>
  );
}

export function FormularioDeTipoProprio({ acao }: { acao: Acao }) {
  const [estado, enviar] = useActionState(acao, {});
  return (
    <form action={enviar} className="grid gap-4">
      <MensagemDoFormulario estado={estado} />
      <Campo rotulo="Nome do tipo" name="nome" required minLength={2} maxLength={120} autoComplete="off" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Dias" name="dias" type="number" inputMode="numeric" required min={1} max={365} />
        <CampoDeEscolha rotulo="Contagem" name="contagem" defaultValue="uteis">
          <option value="uteis">Dias úteis</option>
          <option value="corridos">Dias corridos</option>
        </CampoDeEscolha>
      </div>
      <BotaoEnviar enviando="Criando…" className="sm:justify-self-start sm:px-5">
        Criar tipo
      </BotaoEnviar>
    </form>
  );
}

export function FormularioDeDiaSemExpediente({ acao, tribunais }: { acao: Acao; tribunais: string[] }) {
  const [estado, enviar] = useActionState(acao, {});
  return (
    <form action={enviar} className="grid gap-4">
      <MensagemDoFormulario estado={estado} />
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoDeEscolha rotulo="Tribunal" name="tribunal" defaultValue={tribunais[0]}>
          {tribunais.map((sigla) => (
            <option key={sigla} value={sigla}>
              {sigla}
            </option>
          ))}
        </CampoDeEscolha>
        <Campo rotulo="Data" name="data" type="date" required />
      </div>
      <Campo rotulo="Motivo" name="motivo" required minLength={2} maxLength={120} autoComplete="off" dica="Por exemplo, o número da portaria ou o feriado municipal." />
      <BotaoEnviar enviando="Cadastrando…" className="sm:justify-self-start sm:px-5">
        Cadastrar dia
      </BotaoEnviar>
    </form>
  );
}
