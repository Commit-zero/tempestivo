import { criarData, formatarData, type DataCivil } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { telefoneParaWhatsApp } from "@/lib/documento";

// Regras puras de honorários: divisão em parcelas, situação e texto da cobrança.

export type ParcelaPlanejada = { numero: number; valorCentavos: number; vencimento: DataCivil };

function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/**
 * Divide o total em parcelas mensais. A soma é sempre exata: os centavos que
 * sobram da divisão vão para a primeira parcela. O dia do vencimento se repete
 * a cada mês; em mês mais curto (dia 31 em fevereiro) vale o último dia do mês.
 */
export function dividirEmParcelas(totalCentavos: number, quantidade: number, primeiroVencimento: DataCivil): ParcelaPlanejada[] {
  const base = Math.floor(totalCentavos / quantidade);
  const sobra = totalCentavos - base * quantidade;
  const [ano, mes, dia] = primeiroVencimento.split("-").map(Number);
  return Array.from({ length: quantidade }, (_, indice) => {
    const mesCorrido = mes - 1 + indice;
    const anoDaParcela = ano + Math.floor(mesCorrido / 12);
    const mesDaParcela = (mesCorrido % 12) + 1;
    return {
      numero: indice + 1,
      valorCentavos: base + (indice === 0 ? sobra : 0),
      vencimento: criarData(anoDaParcela, mesDaParcela, Math.min(dia, ultimoDiaDoMes(anoDaParcela, mesDaParcela))),
    };
  });
}

export type SituacaoDaParcela = "paga" | "em_atraso" | "vence_hoje" | "a_vencer";

export function situacaoDaParcela(parcela: { vencimento: DataCivil; pagaEm: Date | null }, hoje: DataCivil): SituacaoDaParcela {
  if (parcela.pagaEm) return "paga";
  if (parcela.vencimento < hoje) return "em_atraso";
  return parcela.vencimento === hoje ? "vence_hoje" : "a_vencer";
}

export type DadosDaCobranca = {
  nomeDoCliente: string;
  telefone: string | null;
  descricao: string;
  numero: number;
  totalDeParcelas: number;
  valorCentavos: number;
  vencimento: DataCivil;
  situacao: SituacaoDaParcela;
  remetente: string;
};

/**
 * Link `wa.me` com a mensagem de cobrança pronta. Quem envia é o advogado, pelo
 * WhatsApp dele: o sistema não envia nada sozinho. `null` sem telefone válido.
 */
export function linkDeCobranca(dados: DadosDaCobranca): string | null {
  const telefone = dados.telefone ? telefoneParaWhatsApp(dados.telefone) : null;
  if (!telefone || dados.situacao === "paga") return null;
  const parcela = dados.totalDeParcelas > 1 ? `a parcela ${dados.numero} de ${dados.totalDeParcelas}` : "o valor";
  const quando = dados.situacao === "em_atraso" ? `venceu em ${formatarData(dados.vencimento)}` : `vence em ${formatarData(dados.vencimento)}`;
  const mensagem =
    `Olá, ${dados.nomeDoCliente.split(" ")[0]}. Tudo bem? Passando para lembrar que ${parcela} dos honorários ` +
    `(${dados.descricao}), no valor de ${formatarReais(dados.valorCentavos)}, ${quando}. ` +
    `Qualquer dúvida, fico à disposição. ${dados.remetente}`;
  return `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
}
