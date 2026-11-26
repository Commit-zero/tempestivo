"use client";

import { Aviso } from "@/components/app/aviso";
import Link from "next/link";
import { useActionState } from "react";
import { BotaoEnviar, CampoDeTexto } from "@/components/formulario";
import { Button } from "@/components/ui/button";
import { formatarData } from "@/lib/datas";
import type { Rascunho } from "@/modules/intimacao";
import { acaoLerIntimacao, type EstadoDaLeitura } from "./acoes";

const EVENTO: Record<NonNullable<Rascunho["tipoEvento"]>, string> = {
  intimacao: "intimação", disponibilizacao: "disponibilização no diário", publicacao: "publicação no diário",
};
const CONFIANCA: Record<Rascunho["confianca"], { texto: string; classe: string }> = {
  alta: { texto: "Leitura completa", classe: "bg-positivo-fundo text-positivo" },
  media: { texto: "Leitura parcial", classe: "bg-atencao-fundo text-atencao" },
  baixa: { texto: "Pouco foi lido", classe: "bg-perigo-fundo text-destructive" },
};

/** Só os campos do rascunho vão para a URL do formulário; o texto da intimação nunca. */
function linkParaOPrazo(rascunho: Rascunho): string {
  const parametros = new URLSearchParams({ rascunho: "1" });
  if (rascunho.processo) parametros.set("processo", rascunho.processo.id);
  if (rascunho.dataEvento) parametros.set("dataEvento", rascunho.dataEvento);
  if (rascunho.tipoEvento) parametros.set("tipoEvento", rascunho.tipoEvento);
  if (rascunho.dias) parametros.set("dias", String(rascunho.dias));
  if (rascunho.contagem) parametros.set("contagem", rascunho.contagem);
  if (rascunho.emDobro) parametros.set("emDobro", "1");
  if (rascunho.descricao) parametros.set("descricao", rascunho.descricao);
  return `/prazos/novo?${parametros.toString()}`;
}

function Linha({ rotulo, valor, evidencia }: { rotulo: string; valor: string | null; evidencia?: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{rotulo}</dt>
      <dd className={valor ? "font-medium" : "text-muted-foreground"}>{valor ?? "não encontrado"}</dd>
      {evidencia ? <dd className="text-sm text-muted-foreground italic break-words">“{evidencia}”</dd> : null}
    </div>
  );
}

export function LeitorDeIntimacao() {
  const [estado, enviar] = useActionState<EstadoDaLeitura, FormData>(acaoLerIntimacao, {});
  const rascunho = estado.rascunho;
  return (
    <div className="grid gap-6">
      <form action={enviar} className="grid gap-4">
        {estado.erro ? (
          <Aviso tipo="erro">
            {estado.erro}
          </Aviso>
        ) : null}
        <CampoDeTexto
          rotulo="Texto da intimação"
          name="texto"
          required
          minLength={20}
          maxLength={20000}
          rows={8}
          placeholder="Cole aqui o texto da intimação ou da publicação."
          dica="A leitura é feita por regras no próprio Tempestivo: o texto não é enviado a terceiros nem fica guardado."
        />
        <BotaoEnviar enviando="Lendo…" className="sm:justify-self-start sm:px-5">
          Ler intimação
        </BotaoEnviar>
      </form>

      <div aria-live="polite">
        {rascunho ? (
          <section aria-label="Rascunho lido" className="grid gap-4 rounded-md border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight">Rascunho</h2>
              <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium ${CONFIANCA[rascunho.confianca].classe}`}>
                {CONFIANCA[rascunho.confianca].texto}
              </span>
            </div>
            <Aviso tipo="atencao">
              Isto é só uma sugestão. O prazo só será criado depois que você conferir cada campo, calcular a data e salvar.
            </Aviso>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Linha rotulo="Processo" valor={rascunho.processo?.assunto ?? null} evidencia={rascunho.evidencias.numeroProcesso} />
              <Linha rotulo="Tipo de ato" valor={rascunho.descricao} evidencia={rascunho.evidencias.descricao} />
              <Linha
                rotulo="Prazo"
                valor={rascunho.dias ? `${rascunho.dias} dias ${rascunho.contagem === "corridos" ? "corridos" : "úteis"}${rascunho.emDobro ? " (em dobro)" : ""}` : null}
                evidencia={rascunho.evidencias.dias}
              />
              <Linha
                rotulo="Data do evento"
                valor={rascunho.dataEvento ? `${formatarData(rascunho.dataEvento)}${rascunho.tipoEvento ? ` (${EVENTO[rascunho.tipoEvento]})` : ""}` : null}
                evidencia={rascunho.evidencias.dataEvento}
              />
            </dl>
            {rascunho.avisos.length > 0 ? (
              <ul className="grid list-disc gap-1 pl-5 text-sm">
                {rascunho.avisos.map((aviso) => (
                  <li key={aviso}>{aviso}</li>
                ))}
              </ul>
            ) : null}
            <Button asChild className="sm:justify-self-start sm:px-5">
              <Link href={linkParaOPrazo(rascunho)}>Conferir e cadastrar o prazo</Link>
            </Button>
          </section>
        ) : null}
      </div>
    </div>
  );
}
