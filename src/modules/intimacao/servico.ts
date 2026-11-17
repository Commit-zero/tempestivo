import { z } from "zod";
import { ehDataCivil } from "@/lib/datas";
import { falha, sucesso, type Resultado } from "@/lib/resultado";
import { listarProcessos } from "@/modules/processos";
import type { Extrator } from "@/platform/ai";

// Leitor de intimação. A leitura só sugere: o resultado é um rascunho que preenche
// o formulário de novo prazo, e o prazo só existe depois que o advogado confere a
// contagem e salva. O texto da intimação não é gravado nem vai para o log.

const TAMANHO_MINIMO = 20;
const TAMANHO_MAXIMO = 20_000;

// A saída do extrator é `unknown`: tudo o que não passar aqui é descartado, campo a campo.
const campo = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined);
const schemaRascunho = z.object({
  numeroProcesso: campo(z.string().regex(/^\d{20}$/)),
  dataEvento: campo(z.string().refine(ehDataCivil)),
  tipoEvento: campo(z.enum(["intimacao", "disponibilizacao", "publicacao"])),
  dias: campo(z.number().int().min(1).max(365)),
  contagem: campo(z.enum(["uteis", "corridos"])),
  emDobro: campo(z.boolean()),
  descricao: campo(z.string().min(2).max(160)),
  dataIncerta: campo(z.boolean()),
  confianca: z.enum(["alta", "media", "baixa"]).catch("baixa"),
  evidencias: z.record(z.string(), z.string().max(400)).catch({}),
});

export type Rascunho = {
  processo: { id: string; assunto: string } | null;
  numeroProcesso: string | null;
  dataEvento: string | null;
  tipoEvento: "intimacao" | "disponibilizacao" | "publicacao" | null;
  dias: number | null;
  contagem: "uteis" | "corridos" | null;
  emDobro: boolean;
  descricao: string | null;
  confianca: "alta" | "media" | "baixa";
  /** O que o advogado precisa conferir ou preencher à mão. */
  avisos: string[];
  /** Trecho do texto de onde cada campo saiu. */
  evidencias: Record<string, string>;
};

export async function lerIntimacao(contaId: string, texto: unknown, extrator: Extrator): Promise<Resultado<Rascunho>> {
  if (typeof texto !== "string" || texto.trim().length < TAMANHO_MINIMO) {
    return falha("Cole o texto da intimação.");
  }
  if (texto.length > TAMANHO_MAXIMO) {
    return falha(`O texto é longo demais. Cole só a intimação (até ${TAMANHO_MAXIMO.toLocaleString("pt-BR")} caracteres).`);
  }

  let bruto: unknown;
  try {
    bruto = await extrator.extrair(texto);
  } catch {
    return falha("Não foi possível ler a intimação agora. Preencha o prazo manualmente.");
  }
  const lido = schemaRascunho.safeParse(bruto);
  if (!lido.success) return falha("Não foi possível ler a intimação. Preencha o prazo manualmente.");
  const dados = lido.data;

  // O processo é procurado só entre os da própria conta.
  const processo = dados.numeroProcesso
    ? ((await listarProcessos(contaId, { busca: dados.numeroProcesso })).find((item) => item.numero === dados.numeroProcesso) ?? null)
    : null;

  const avisos: string[] = [];
  if (!dados.numeroProcesso) avisos.push("Não achei o número do processo no texto. Escolha o processo.");
  else if (!processo) avisos.push("O processo deste número não está cadastrado na sua conta. Cadastre-o ou escolha outro.");
  else if (processo.status === "arquivado") avisos.push("O processo deste número está arquivado. Reative-o para cadastrar o prazo.");
  if (dados.dias === undefined) avisos.push("Não achei a quantidade de dias. Informe o prazo.");
  if (dados.dataEvento === undefined) avisos.push("Não achei a data do evento. Informe a data.");
  else if (dados.dataIncerta || dados.tipoEvento === undefined) {
    avisos.push("Achei uma data, mas o texto não diz se é de intimação, disponibilização ou publicação. Confira a data e o tipo de evento.");
  }
  if (dados.dias !== undefined && dados.contagem === undefined) {
    avisos.push("O texto não diz se os dias são úteis ou corridos. Deixei como dias úteis; confira.");
  }

  return sucesso({
    processo: processo && processo.status === "ativo" ? { id: processo.id, assunto: processo.assunto } : null,
    numeroProcesso: dados.numeroProcesso ?? null,
    dataEvento: dados.dataEvento ?? null,
    tipoEvento: dados.tipoEvento ?? null,
    dias: dados.dias ?? null,
    contagem: dados.contagem ?? null,
    emDobro: dados.emDobro ?? false,
    descricao: dados.descricao ?? null,
    confianca: dados.confianca,
    avisos,
    evidencias: dados.evidencias,
  });
}
