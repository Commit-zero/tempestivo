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

function montarFaixa(): DiaDaFaixa[] {
  const faixa: DiaDaFaixa[] = [{ data: INTIMACAO, tipo: "intimacao" }];
  let numero = 0;
  for (let data = somarDias(INTIMACAO, 1); data <= VENCIMENTO; data = somarDias(data, 1)) {
    const motivo = SEM_EXPEDIENTE[data];
    faixa.push(motivo ? { data, tipo: "sem-expediente", motivo } : { data, tipo: "contado", numero: (numero += 1) });
  }
  return faixa;
}

export const EXEMPLO_DE_CONTAGEM = {
  ato: "Contestação",
  tribunal: "TJSP",
  dias: 15,
  intimacao: INTIMACAO,
  vencimento: VENCIMENTO,
  metaInterna: "2026-12-02",
  faixa: montarFaixa(),
} as const;
