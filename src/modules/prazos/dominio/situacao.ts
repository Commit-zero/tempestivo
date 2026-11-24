import { dataCivilEmSaoPaulo, diasEntre, type DataCivil } from "@/lib/datas";

// "Status honesto": o prazo mostra o que o próprio advogado conferiu e há quanto
// tempo, em vez de um "tudo certo" que ninguém verificou. "Vencido" é derivado da
// data final; nunca é gravado.

export type StatusPrazo = "pendente" | "confirmado" | "cumprido";

export const DIAS_PARA_DESTACAR_SEM_CONFERENCIA = 3;

export type DadosDaSituacao = {
  status: StatusPrazo;
  dataFinal: DataCivil;
  ultimaConferenciaEm: Date | null;
  criadoEm: Date;
};

export type Situacao = {
  /** Dias corridos até a data final (negativo se já passou). */
  diasRestantes: number;
  vencido: boolean;
  /** Ex.: "vence em 3 dias", "vence hoje", "venceu há 2 dias", "cumprido". */
  quando: string;
  /** Ex.: "conferido hoje", "sem conferência há 4 dias". Vazio para prazo cumprido. */
  conferencia: string;
  /** Verdadeiro quando a falta de conferência pede atenção. */
  conferenciaAtrasada: boolean;
  urgencia: "cumprido" | "vencido" | "hoje" | "proximo" | "normal";
  /** Data em que o trabalho deve estar pronto; `null` para prazo cumprido. */
  metaInterna: DataCivil | null;
  /** A meta interna é hoje ou já passou, e o prazo ainda não venceu. */
  metaChegou: boolean;
};

const plural = (quantidade: number, singular: string, variosTexto: string) =>
  quantidade === 1 ? `1 ${singular}` : `${quantidade} ${variosTexto}`;

export function situacaoDoPrazo(prazo: DadosDaSituacao, agora: Date, metaInterna: DataCivil | null = null): Situacao {
  const hoje = dataCivilEmSaoPaulo(agora);
  const diasRestantes = diasEntre(hoje, prazo.dataFinal);

  if (prazo.status === "cumprido") {
    return {
      diasRestantes, vencido: false, quando: "cumprido", conferencia: "", conferenciaAtrasada: false, urgencia: "cumprido",
      metaInterna: null, metaChegou: false,
    };
  }

  const vencido = diasRestantes < 0;
  const quando = vencido
    ? `venceu há ${plural(-diasRestantes, "dia", "dias")}`
    : diasRestantes === 0
      ? "vence hoje"
      : diasRestantes === 1
        ? "vence amanhã"
        : `vence em ${diasRestantes} dias`;

  const referencia = prazo.ultimaConferenciaEm ?? prazo.criadoEm;
  const diasSemConferir = Math.max(0, diasEntre(dataCivilEmSaoPaulo(referencia), hoje));
  const conferencia = prazo.ultimaConferenciaEm
    ? diasSemConferir === 0
      ? "conferido hoje"
      : `conferido há ${plural(diasSemConferir, "dia", "dias")}`
    : diasSemConferir === 0
      ? "ainda não conferido"
      : `sem conferência há ${plural(diasSemConferir, "dia", "dias")}`;

  const temMeta = metaInterna !== null && metaInterna < prazo.dataFinal && !vencido;
  return {
    diasRestantes,
    vencido,
    quando,
    conferencia,
    conferenciaAtrasada: diasSemConferir >= DIAS_PARA_DESTACAR_SEM_CONFERENCIA,
    urgencia: vencido ? "vencido" : diasRestantes === 0 ? "hoje" : diasRestantes <= 7 ? "proximo" : "normal",
    // Prazo vencido não tem mais meta a cumprir; no dia do vencimento, a meta continua destacada.
    metaInterna: temMeta ? metaInterna : null,
    metaChegou: temMeta && hoje >= metaInterna,
  };
}
