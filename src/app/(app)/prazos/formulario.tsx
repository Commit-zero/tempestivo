"use client";

import { Aviso } from "@/components/app/aviso";
import { useActionState, useState, useTransition } from "react";
import { BotaoEnviar, Campo, CampoDeEscolha, CampoDeMarcar, MensagemDoFormulario } from "@/components/formulario";
import { Button } from "@/components/ui/button";
import type { EstadoDoFormulario } from "@/lib/formulario";
import type { ResultadoCalculo } from "@/modules/prazos";
import { MemoriaDoCalculo } from "@/components/app/memoria";
import type { DadosDaPrevia } from "./acoes";

type Acao = (anterior: EstadoDoFormulario, formulario: FormData) => Promise<EstadoDoFormulario>;

export type OpcaoDeProcesso = { id: string; rotulo: string; tribunal: string; atendido: boolean };
export type OpcaoDeTipo = { id: string; nome: string; dias: number; contagem: string };

export type ValoresDoPrazo = {
  origem: "calculada" | "manual";
  processoId: string;
  descricao: string;
  tipoEvento: string;
  dataEvento: string;
  dias: string;
  contagem: string;
  emDobro: boolean;
  dataFinal: string;
};

const EVENTOS = [
  { valor: "intimacao", rotulo: "Intimação (data da ciência)" },
  { valor: "disponibilizacao", rotulo: "Disponibilização no diário eletrônico" },
  { valor: "publicacao", rotulo: "Publicação no diário" },
  { valor: "intimacao_tacita", rotulo: "Intimação eletrônica não consultada (data do envio)" },
];

export function FormularioDePrazo({
  acaoSalvar, acaoPrever, processos, tipos, inicial, avisoDeRegrasPendentes, editando = false,
}: {
  /** Texto do aviso que a calculadora põe quando há regra pendente; vem do servidor. */
  avisoDeRegrasPendentes: string;
  acaoSalvar: Acao;
  acaoPrever: (dados: DadosDaPrevia) => Promise<ResultadoCalculo>;
  processos: OpcaoDeProcesso[];
  tipos: OpcaoDeTipo[];
  inicial: ValoresDoPrazo;
  editando?: boolean;
}) {
  const [estado, enviar] = useActionState(acaoSalvar, {});
  const [valores, setValores] = useState(inicial);
  const [previa, setPrevia] = useState<ResultadoCalculo | null>(null);
  const [calculando, iniciarCalculo] = useTransition();
  const [conferido, setConferido] = useState(false);

  const processo = processos.find((opcao) => opcao.id === valores.processoId);
  const manual = valores.origem === "manual";

  // Qualquer mudança nos dados do cálculo invalida a prévia: o que se salva é sempre o que se viu.
  function mudar(parte: Partial<ValoresDoPrazo>) {
    setValores((atuais) => ({ ...atuais, ...parte }));
    setPrevia(null);
    setConferido(false);
  }

  function escolherTipo(id: string) {
    const tipo = tipos.find((opcao) => opcao.id === id);
    if (tipo) mudar({ descricao: tipo.nome, dias: String(tipo.dias), contagem: tipo.contagem });
  }

  function calcular() {
    if (calculando) return;
    iniciarCalculo(async () => {
      const { processoId, dataEvento, tipoEvento, dias, contagem, emDobro } = valores;
      setPrevia(await acaoPrever({ processoId, dataEvento, tipoEvento, dias, contagem, emDobro }));
    });
  }

  const podeCalcular = valores.processoId !== "" && valores.dataEvento !== "" && valores.dias !== "";
  const exigeConferencia = !manual && previa?.ok === true && previa.avisos.includes(avisoDeRegrasPendentes);
  const podeSalvar = manual ? valores.dataFinal !== "" : previa?.ok === true && (!exigeConferencia || conferido);

  return (
    <form action={enviar} className="grid gap-5">
      <MensagemDoFormulario estado={estado} />
      <input type="hidden" name="origem" value={valores.origem} />

      {editando ? (
        <input type="hidden" name="processoId" value={valores.processoId} />
      ) : (
        <CampoDeEscolha rotulo="Processo" name="processoId" required value={valores.processoId} onChange={(evento) => mudar({ processoId: evento.target.value })}>
          <option value="" disabled>
            Escolha o processo
          </option>
          {processos.map((opcao) => (
            <option key={opcao.id} value={opcao.id}>
              {opcao.rotulo}
            </option>
          ))}
        </CampoDeEscolha>
      )}

      {manual ? null : (
        <CampoDeEscolha
          rotulo="Tipo de prazo"
          value=""
          onChange={(evento) => escolherTipo(evento.target.value)}
          dica="Preenche a descrição e os dias. Você pode alterar depois."
        >
          <option value="">Escolher do catálogo…</option>
          {tipos.map((tipo) => (
            <option key={tipo.id} value={tipo.id}>
              {tipo.nome} ({tipo.dias} dias {tipo.contagem === "uteis" ? "úteis" : "corridos"})
            </option>
          ))}
        </CampoDeEscolha>
      )}

      <Campo rotulo="Descrição" name="descricao" required minLength={2} maxLength={160} autoComplete="off" value={valores.descricao} onChange={(evento) => setValores((atuais) => ({ ...atuais, descricao: evento.target.value }))} />

      {manual ? (
        <Campo
          rotulo="Data final"
          name="dataFinal"
          type="date"
          required
          value={valores.dataFinal}
          onChange={(evento) => mudar({ dataFinal: evento.target.value })}
          dica="Data digitada por você. O prazo fica marcado como “data manual” e não é recalculado."
        />
      ) : (
        <>
          {processo && !processo.atendido ? (
            <Aviso tipo="atencao" role="status">
              A calculadora não atende o tribunal {processo.tribunal}. Use a data final manual.
            </Aviso>
          ) : null}
          <CampoDeEscolha rotulo="Evento que inicia o prazo" name="tipoEvento" value={valores.tipoEvento} onChange={(evento) => mudar({ tipoEvento: evento.target.value })}>
            {EVENTOS.map((evento) => (
              <option key={evento.valor} value={evento.valor}>
                {evento.rotulo}
              </option>
            ))}
          </CampoDeEscolha>
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo rotulo="Data do evento" name="dataEvento" type="date" required value={valores.dataEvento} onChange={(evento) => mudar({ dataEvento: evento.target.value })} />
            <Campo rotulo="Dias" name="dias" type="number" inputMode="numeric" required min={1} max={365} value={valores.dias} onChange={(evento) => mudar({ dias: evento.target.value })} />
            <CampoDeEscolha rotulo="Contagem" name="contagem" value={valores.contagem} onChange={(evento) => mudar({ contagem: evento.target.value })}>
              <option value="uteis">Dias úteis</option>
              <option value="corridos">Dias corridos</option>
            </CampoDeEscolha>
          </div>
          <CampoDeMarcar
            name="emDobro"
            rotulo="Prazo em dobro"
            dica="Marque quando a parte tem prazo em dobro (Fazenda Pública, Ministério Público, Defensoria)."
            checked={valores.emDobro}
            onChange={(evento) => mudar({ emDobro: evento.target.checked })}
          />
          <Button type="button" variant="outline" onClick={calcular} disabled={!podeCalcular} aria-busy={calculando} className="sm:justify-self-start sm:px-5">
            {calculando ? "Calculando…" : "Calcular data final"}
          </Button>
          <div aria-live="polite" className="grid gap-3">
            {previa?.ok ? <MemoriaDoCalculo dataFinal={previa.dataFinal} passos={previa.passos} avisos={previa.avisos} regrasAplicadas={previa.regrasAplicadas} /> : null}
            {previa && !previa.ok ? (
              <Aviso tipo="atencao" role="alert">
                {previa.motivo}
              </Aviso>
            ) : null}
          </div>
        </>
      )}

      {exigeConferencia ? (
        <CampoDeMarcar
          name="conferiNosAutos"
          rotulo="Conferi esta data final nos autos"
          dica="As regras desta contagem ainda não foram validadas por um advogado. A data só é salva com a sua confirmação."
          checked={conferido}
          onChange={(evento) => setConferido(evento.target.checked)}
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        <BotaoEnviar enviando="Salvando…" disabled={!podeSalvar} className="sm:px-5">
          {editando ? "Salvar alterações" : "Salvar prazo"}
        </BotaoEnviar>
        <Button type="button" variant="link" className="h-11 px-0 md:h-9" onClick={() => mudar({ origem: manual ? "calculada" : "manual" })}>
          {manual ? "Usar a calculadora" : "Digitar a data final"}
        </Button>
      </div>
      {!manual && !podeSalvar ? <p className="text-sm text-muted-foreground">Calcule a data final para conferir a contagem antes de salvar.</p> : null}
    </form>
  );
}
