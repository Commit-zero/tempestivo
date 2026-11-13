import type { Contagem } from "../dominio/calcular-prazo";
import type { Ramo } from "../dominio/calendario";

export type TipoBase = {
  chave: string;
  nome: string;
  dias: number;
  contagem: Contagem;
  ramo: Ramo;
  referencia: string;
};

// Catálogo inicial. Todos os itens são rascunho escrito sem conferência em fonte
// e aguardam o advogado validador; por isso a tela avisa que os dias de cada tipo
// são responsabilidade de quem usa, e cada conta pode ajustá-los.
export const CATALOGO_BASE: readonly TipoBase[] = [
  { chave: "contestacao", nome: "Contestação (cível)", dias: 15, contagem: "uteis", ramo: "civel", referencia: "CPC, art. 335" },
  { chave: "replica", nome: "Réplica (cível)", dias: 15, contagem: "uteis", ramo: "civel", referencia: "CPC, art. 351" },
  { chave: "apelacao", nome: "Apelação", dias: 15, contagem: "uteis", ramo: "civel", referencia: "CPC, art. 1.003, § 5º" },
  { chave: "agravo-de-instrumento", nome: "Agravo de instrumento", dias: 15, contagem: "uteis", ramo: "civel", referencia: "CPC, art. 1.003, § 5º" },
  { chave: "contrarrazoes", nome: "Contrarrazões de recurso", dias: 15, contagem: "uteis", ramo: "civel", referencia: "CPC, art. 1.003, § 5º" },
  { chave: "embargos-de-declaracao-civel", nome: "Embargos de declaração (cível)", dias: 5, contagem: "uteis", ramo: "civel", referencia: "CPC, art. 1.023" },
  { chave: "cumprimento-pagamento", nome: "Cumprimento de sentença: pagamento", dias: 15, contagem: "uteis", ramo: "civel", referencia: "CPC, art. 523" },
  { chave: "impugnacao-ao-cumprimento", nome: "Impugnação ao cumprimento", dias: 15, contagem: "uteis", ramo: "civel", referencia: "CPC, art. 525" },
  { chave: "manifestacao", nome: "Manifestação sem prazo previsto", dias: 5, contagem: "uteis", ramo: "civel", referencia: "CPC, art. 218, § 3º" },
  { chave: "recurso-ordinario", nome: "Recurso ordinário (trabalhista)", dias: 8, contagem: "uteis", ramo: "trabalhista", referencia: "CLT, art. 895" },
  { chave: "embargos-de-declaracao-trabalhista", nome: "Embargos de declaração (trabalhista)", dias: 5, contagem: "uteis", ramo: "trabalhista", referencia: "CLT, art. 897-A" },
  { chave: "agravo-de-peticao", nome: "Agravo de petição", dias: 8, contagem: "uteis", ramo: "trabalhista", referencia: "CLT, art. 897" },
  { chave: "recurso-de-revista", nome: "Recurso de revista", dias: 8, contagem: "uteis", ramo: "trabalhista", referencia: "CLT, art. 896" },
];
