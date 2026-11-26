import type { ReactNode } from "react";
import { MemoriaDoCalculo } from "@/components/app/memoria";
import { SeloDeVencimento, TextoDaConferencia } from "@/components/app/prazo";
import { ResumoFinanceiro } from "@/components/app/resumo-financeiro";
import { buttonVariants } from "@/components/ui/button";
import { EXEMPLO_DE_CONTAGEM as exemplo } from "@/lib/exemplo-de-contagem";
import { AVISO_CALCULO_AUXILIAR, type Situacao } from "@/modules/prazos";

// As telas do carrossel são feitas com os componentes do próprio app, com dados
// fictícios: não são imagens, então mudam junto com o produto. Nada aqui é clicável.

export const NOMES_DAS_TELAS = ["Prazo com a contagem", "O painel do dia", "Honorários e cobrança", "A agenda no celular"] as const;

function situacao(urgencia: Situacao["urgencia"], quando: string, conferencia: string, atrasada = false): Situacao {
  return {
    diasRestantes: 0, vencido: urgencia === "vencido", quando, conferencia, conferenciaAtrasada: atrasada, urgencia,
    metaInterna: null, metaChegou: false,
  };
}

function Tela({ titulo, texto, children }: { titulo: string; texto: string; children: ReactNode }) {
  return (
    <div className="grid items-start gap-4 md:grid-cols-[1fr_1.6fr] md:gap-8">
      <div className="grid gap-1.5">
        <h3 className="text-xl font-bold tracking-tight">{titulo}</h3>
        <p className="text-sm text-muted-foreground">{texto}</p>
        <p className="text-xs text-muted-foreground">Exemplo com dados fictícios.</p>
      </div>
      <div className="grid min-w-0 gap-3">{children}</div>
    </div>
  );
}

const PRAZOS_DO_DIA = [
  { ato: "Réplica", detalhe: "Cliente Fictícia, ação de cobrança", estado: situacao("hoje", "vence hoje", "conferido hoje") },
  { ato: "Contestação", detalhe: "Cliente Fictício, ação de despejo", estado: situacao("proximo", "vence em 4 dias", "sem conferência há 5 dias", true) },
  { ato: "Recurso ordinário", detalhe: "Cliente Fictícia, reclamação trabalhista", estado: situacao("normal", "vence em 12 dias", "conferido há 2 dias") },
];

const EVENTOS = [
  { dia: "02/12", titulo: "Meta interna: Contestação", detalhe: "Prazo auxiliar, confira" },
  { dia: "03/12", titulo: "Audiência de conciliação, 14:00", detalhe: "Número do processo e local" },
  { dia: "04/12", titulo: "Vence: Contestação", detalhe: "Lembretes antes do dia" },
];

export function TelasDoProduto() {
  return [
    <Tela key="prazo" titulo={NOMES_DAS_TELAS[0]} texto="A data calculada nunca aparece sem os passos e os avisos.">
      <div className="rounded-md border bg-card p-4">
        <MemoriaDoCalculo
          dataFinal={exemplo.vencimento}
          avisos={[AVISO_CALCULO_AUXILIAR]}
          passos={[
            "Intimação em 12/11/2026: é o dia do começo, que não entra na contagem.",
            "A contagem começa em 13/11/2026, o primeiro dia útil seguinte.",
            "Contados 15 dias úteis, sem sábados, domingos, feriados e dias sem expediente.",
          ]}
          regrasAplicadas={[]}
        />
      </div>
    </Tela>,
    <Tela key="painel" titulo={NOMES_DAS_TELAS[1]} texto="De manhã, primeiro o que pede ação hoje.">
      <ul className="divide-y rounded-md border bg-card">
        {PRAZOS_DO_DIA.map(({ ato, detalhe, estado }) => (
          <li key={ato} className="grid gap-1 px-4 py-3">
            <span className="flex items-start justify-between gap-3">
              <span className="font-medium">{ato}</span>
              <SeloDeVencimento situacao={estado} />
            </span>
            <span className="text-sm text-muted-foreground">{detalhe}</span>
            <TextoDaConferencia situacao={estado} />
          </li>
        ))}
      </ul>
    </Tela>,
    <Tela key="honorarios" titulo={NOMES_DAS_TELAS[2]} texto="O que falta receber, o que atrasou e a cobrança pronta. Quem envia é você.">
      <ResumoFinanceiro
        resumo={{ aReceberCentavos: 450_000, emAtrasoCentavos: 90_000, parcelasEmAtraso: 1, recebidoNoMesCentavos: 180_000 }}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-4">
        <span className="grid">
          <span className="font-medium">Parcela 2 de 5, R$ 900,00</span>
          <span className="text-sm text-destructive">em atraso desde 10/11/2026</span>
        </span>
        <span aria-hidden="true" className={buttonVariants({ variant: "outline" })}>
          Cobrar pelo WhatsApp
        </span>
      </div>
    </Tela>,
    <Tela key="agenda" titulo={NOMES_DAS_TELAS[3]} texto="Você assina o link uma vez, e o calendário que já usa passa a mostrar prazos, metas e audiências. Nomes de clientes não vão para ele.">
      <ul className="divide-y rounded-md border bg-card">
        {EVENTOS.map(({ dia, titulo, detalhe }) => (
          <li key={titulo} className="grid grid-cols-[3.5rem_1fr] gap-3 px-4 py-3">
            <span className="text-lg font-bold tabular-nums [font-stretch:75%]">{dia}</span>
            <span className="grid">
              <span className="font-medium">{titulo}</span>
              <span className="text-sm text-muted-foreground">{detalhe}</span>
            </span>
          </li>
        ))}
      </ul>
    </Tela>,
  ];
}
