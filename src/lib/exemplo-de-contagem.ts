import { somarDias, type DataCivil } from "@/lib/datas";

// O exemplo fictício da capa e da imagem de compartilhamento. Só dados: quem garante
// que eles batem com a calculadora é `modules/prazos/__tests__/exemplo-da-capa.test.ts`.

export type DiaDaFaixa =
  | { data: DataCivil; tipo: "intimacao" }
  | { data: DataCivil; tipo: "sem-expediente"; motivo: string }
  | { data: DataCivil; tipo: "contado"; numero: number };

const INTIMACAO = "2026-11-12";
const VENCIMENTO = "2026-12-04";

const SEM_EXPEDIENTE: Record<DataCivil, string> = {
  "2026-11-14": "sábado", "2026-11-15": "domingo", "2026-11-20": "feriado: Consciência Negra", "2026-11-21": "sábado",
  "2026-11-22": "domingo", "2026-11-28": "sábado", "2026-11-29": "domingo",
};

type Exemplo = {
  ato: string;
  tribunal: string;
  dias: number;
  intimacao: DataCivil;
  vencimento: DataCivil;
  metaInterna: DataCivil;
  faixa: DiaDaFaixa[];
  passos: string[];
  avisos: string[];
  regrasAplicadas: string[];
};

function montarFaixa(): DiaDaFaixa[] {
  const faixa: DiaDaFaixa[] = [{ data: INTIMACAO, tipo: "intimacao" }];
  let numero = 0;
  for (let data = somarDias(INTIMACAO, 1); data <= VENCIMENTO; data = somarDias(data, 1)) {
    const motivo = SEM_EXPEDIENTE[data];
    faixa.push(motivo ? { data, tipo: "sem-expediente", motivo } : { data, tipo: "contado", numero: (numero += 1) });
  }
  return faixa;
}

export const EXEMPLO_DE_CONTAGEM: Exemplo = {
  ato: "Contestação",
  tribunal: "TJSP",
  dias: 15,
  intimacao: INTIMACAO,
  vencimento: VENCIMENTO,
  metaInterna: "2026-12-02",
  faixa: montarFaixa(),
  // O que a calculadora devolve para este exemplo, palavra por palavra.
  passos: [
    "Intimação em 12/11/2026 (quinta-feira): é o dia do começo, que não entra na contagem.",
    "A contagem começa em 13/11/2026 (sexta-feira), o primeiro dia útil seguinte.",
    "Contados 15 dias úteis, sem sábados, domingos, feriados e dias sem expediente.",
    "Dias sem expediente no período: 20/11/2026 (feriado: Consciência Negra).",
    "Data final: 04/12/2026 (sexta-feira).",
  ],
  avisos: [
    "Cálculo auxiliar, confira.",
    "As regras deste cálculo ainda não foram validadas por um advogado. Confira a contagem antes de confiar na data.",
  ],
  regrasAplicadas: [
    "R2: Exclui-se o dia do começo e inclui-se o do vencimento; a contagem começa no primeiro dia útil seguinte. (CPC, art. 224, caput e § 3º)",
    "R1: Prazos processuais em dias contam só dias úteis. (CPC, art. 219)",
    "R3: Começo ou vencimento em dia sem expediente forense passa para o primeiro dia útil seguinte. (CPC, art. 224, § 1º)",
  ],
};
